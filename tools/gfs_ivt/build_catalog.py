#!/usr/bin/env python3
"""Scan published GFS IVT runs and atomically write a web catalog."""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path


RUN_PATH_PATTERN = re.compile(r"^(?P<date>\d{8})/(?P<cycle>\d{2})/manifest\.json$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "root",
        type=Path,
        help="Dataset root containing YYYYMMDD/HH/manifest.json directories",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Catalog path; defaults to ROOT/catalog.json",
    )
    parser.add_argument(
        "--dataset",
        default="gfs-ivt-north-pacific",
        help="Stable dataset identifier written to the catalog",
    )
    parser.add_argument(
        "--allow-missing-assets",
        action="store_true",
        help="Include manifests even when a referenced texture or mask is missing",
    )
    return parser.parse_args()


def parse_initialization_time(value: object, manifest_path: Path) -> datetime:
    if not isinstance(value, str):
        raise ValueError(f"{manifest_path}: initializationTime is missing")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{manifest_path}: invalid initializationTime {value!r}") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{manifest_path}: initializationTime must include a timezone")
    return parsed.astimezone(timezone.utc)


def resolve_asset(root: Path, manifest_path: Path, relative_path: object) -> Path:
    if not isinstance(relative_path, str) or not relative_path:
        raise ValueError(f"{manifest_path}: timestep has an invalid asset path")
    resolved = (manifest_path.parent / relative_path).resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError(
            f"{manifest_path}: asset escapes the dataset root: {relative_path}",
        ) from exc
    return resolved


def read_run(
    root: Path,
    manifest_path: Path,
    *,
    allow_missing_assets: bool,
) -> dict[str, object]:
    relative_manifest = manifest_path.relative_to(root).as_posix()
    matched = RUN_PATH_PATTERN.fullmatch(relative_manifest)
    if not matched:
        raise ValueError(f"unexpected run manifest path: {relative_manifest}")

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"could not read {manifest_path}: {exc}") from exc

    initialization = parse_initialization_time(
        manifest.get("initializationTime"),
        manifest_path,
    )
    path_date = matched.group("date")
    path_cycle = matched.group("cycle")
    if initialization.strftime("%Y%m%d") != path_date:
        raise ValueError(
            f"{manifest_path}: initialization date does not match directory {path_date}",
        )
    if initialization.strftime("%H") != path_cycle:
        raise ValueError(
            f"{manifest_path}: initialization hour does not match directory {path_cycle}",
        )

    timesteps = manifest.get("timesteps")
    if not isinstance(timesteps, list) or not timesteps:
        raise ValueError(f"{manifest_path}: timesteps must be a non-empty array")

    forecast_hours: list[int] = []
    missing_assets: list[str] = []
    for timestep in timesteps:
        if not isinstance(timestep, dict) or not isinstance(timestep.get("forecastHour"), int):
            raise ValueError(f"{manifest_path}: timestep forecastHour must be an integer")
        forecast_hours.append(timestep["forecastHour"])
        for field in ("texture", "mask"):
            asset = resolve_asset(root, manifest_path, timestep.get(field))
            if not asset.is_file():
                missing_assets.append(asset.relative_to(root.resolve()).as_posix())

    if missing_assets and not allow_missing_assets:
        preview = ", ".join(missing_assets[:3])
        suffix = "..." if len(missing_assets) > 3 else ""
        raise ValueError(f"{manifest_path}: missing assets: {preview}{suffix}")

    run: dict[str, object] = {
        "date": initialization.strftime("%Y-%m-%d"),
        "initializationTime": initialization.isoformat().replace("+00:00", "Z"),
        "cycle": path_cycle,
        "manifest": relative_manifest,
        "forecastHours": sorted(set(forecast_hours)),
    }
    if missing_assets:
        run["missingAssets"] = missing_assets
    return run


def build_catalog(
    root: Path,
    dataset: str,
    *,
    allow_missing_assets: bool = False,
) -> dict[str, object]:
    root = root.resolve()
    if not root.is_dir():
        raise ValueError(f"dataset root is not a directory: {root}")

    manifests = sorted(
        path
        for path in root.glob("[0-9]" * 8 + "/[0-9][0-9]/manifest.json")
        if path.is_file()
    )
    if not manifests:
        raise ValueError(f"no YYYYMMDD/HH/manifest.json runs found under {root}")

    runs = [
        read_run(root, path, allow_missing_assets=allow_missing_assets)
        for path in manifests
    ]
    runs.sort(key=lambda run: str(run["initializationTime"]), reverse=True)

    initialization_times = [str(run["initializationTime"]) for run in runs]
    if len(initialization_times) != len(set(initialization_times)):
        raise ValueError("duplicate initialization times found in the dataset")

    dates = sorted({str(run["date"]) for run in runs}, reverse=True)
    return {
        "schemaVersion": 1,
        "dataset": dataset,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "runCount": len(runs),
        "dates": dates,
        "defaultInitializationDate": dates[0],
        "runs": runs,
    }


def write_catalog(catalog: dict[str, object], output_path: Path) -> None:
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=output_path.name + ".",
        suffix=".tmp",
        dir=output_path.parent,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as output:
            json.dump(catalog, output, indent=2)
            output.write("\n")
        os.replace(temporary_path, output_path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise


def main() -> int:
    args = parse_args()
    output_path = args.output or (args.root / "catalog.json")
    try:
        catalog = build_catalog(
            args.root,
            args.dataset,
            allow_missing_assets=args.allow_missing_assets,
        )
        write_catalog(catalog, output_path)
    except ValueError as exc:
        print(f"error: {exc}")
        return 1
    print(f"Wrote {catalog['runCount']} runs to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
