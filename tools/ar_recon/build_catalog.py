#!/usr/bin/env python3
"""Build a browser-facing catalog from converted AR Recon flight manifests."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "1.0.0"
YEAR_PATTERN = re.compile(r"^\d{4}$")
IOP_PATTERN = re.compile(r"^IOP\d+$", re.IGNORECASE)


def find_hierarchy(relative_manifest: Path, manifest: dict[str, Any]) -> tuple[str, str, str]:
    directories = relative_manifest.parts[:-1]
    year = next((part for part in directories if YEAR_PATTERN.match(part)), "")
    iop = next((part.upper() for part in directories if IOP_PATTERN.match(part)), "")
    aircraft = str(manifest.get("inputDirectory") or (directories[-1] if directories else ""))
    return year, iop, aircraft


def build_catalog(input_dir: Path) -> dict[str, Any]:
    flights = []
    warnings = []
    for manifest_path in sorted(input_dir.rglob("manifest.json")):
        relative_manifest = manifest_path.relative_to(input_dir)
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            warnings.append(f"Could not read {relative_manifest.as_posix()}: {error}")
            continue
        flight_id = str(manifest.get("flightId") or "").strip()
        year, iop, aircraft = find_hierarchy(relative_manifest, manifest)
        if not flight_id or not year or not iop or not aircraft:
            warnings.append(
                f"Skipped {relative_manifest.as_posix()}: flightId/year/IOP/aircraft could not be determined"
            )
            continue
        platforms = manifest.get("platforms") or []
        flights.append(
            {
                "id": flight_id,
                "year": year,
                "iop": iop,
                "aircraft": aircraft,
                "label": aircraft.replace("NOAA-GIV", "NOAA G-IV"),
                "platforms": platforms,
                "originTime": manifest.get("originTime"),
                "endTime": manifest.get("endTime"),
                "manifestUrl": relative_manifest.as_posix(),
                "sondeCount": manifest.get("sondes", {}).get("count", 0),
            }
        )
    flights.sort(
        key=lambda flight: (
            int(flight["year"]),
            int(re.sub(r"\D", "", flight["iop"]) or 0),
            flight.get("originTime") or "",
            flight["aircraft"],
        ),
        reverse=True,
    )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "flightCount": len(flights),
        "flights": flights,
        "warnings": warnings,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Root containing year/IOP/aircraft bundles")
    parser.add_argument("--output", type=Path, help="Catalog path (default: <input>/index.json)")
    parser.add_argument("--compact", action="store_true", help="Write compact JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input.resolve()
    output_path = args.output.resolve() if args.output else input_dir / "index.json"
    if not input_dir.is_dir():
        print(f"Input directory does not exist: {input_dir}", file=sys.stderr)
        return 2
    catalog = build_catalog(input_dir)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(
            catalog,
            separators=(",", ":") if args.compact else None,
            indent=None if args.compact else 2,
        ) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {catalog['flightCount']} flights to {output_path}")
    if catalog["warnings"]:
        print(f"Completed with {len(catalog['warnings'])} warning(s)")
    return 0 if catalog["flightCount"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
