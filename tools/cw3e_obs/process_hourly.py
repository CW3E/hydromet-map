#!/usr/bin/env python3
"""Normalize CW3E SurfaceMetObs hourly files into browser-friendly CSVs."""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable


DEFAULT_INPUT = Path("/data/CW3E_data/CW3E_DataShare/CW3E_SurfaceMetObs")
DEFAULT_OUTPUT = Path("cw3e_obs")
README_COLUMN_PATTERN = re.compile(r"^\s*(\d+)\s*[.)]\s*(.+?)\s*$")
YEAR_PATTERN = re.compile(r"^\d{4}$")
DEPTH_PATTERN = re.compile(r"(?P<depth>\d+(?:\.\d+)?)\s*cm", re.IGNORECASE)


@dataclass
class StationReport:
    station_id: str
    status: str = "ok"
    schema_file: str | None = None
    files_seen: int = 0
    files_loaded: int = 0
    rows_loaded: int = 0
    malformed_rows: int = 0
    unexpected_column_counts: Counter = field(default_factory=Counter)
    duplicate_timestamps: int = 0
    timestamp_errors: int = 0
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        result = vars(self).copy()
        result["unexpected_column_counts"] = dict(sorted(self.unexpected_column_counts.items()))
        return result


def slugify(value: str) -> str:
    value = value.lower().replace("%", " pct ").replace("°", "")
    value = re.sub(r"[^a-z0-9]+", "_", value).strip("_")
    return value or "value"


def canonical_column(label: str, position: int) -> str:
    """Map common README labels to stable names while retaining unfamiliar fields."""
    normalized = re.sub(r"\s+", " ", label.strip()).lower()
    depth_match = DEPTH_PATTERN.search(normalized)
    depth = depth_match.group("depth").replace(".", "p") if depth_match else None

    if position == 1 and normalized == "year":
        return "year"
    if position == 2 and normalized == "month":
        return "month"
    if position == 3 and normalized == "day":
        return "day"
    if position == 4 and normalized == "hour":
        return "hour"
    if "pressure" in normalized:
        return "pressure_hpa"
    if "relative humidity" in normalized:
        return "relative_humidity_pct"
    if "precip" in normalized:
        return "precipitation_mm"
    if "solar radiation" in normalized:
        return "solar_radiation_wm2"
    if "wind direction" in normalized:
        return "wind_direction_deg"
    if "maximum wind" in normalized or "max wind" in normalized or "wind gust" in normalized:
        return "wind_gust_ms"
    if "wind speed" in normalized:
        return "wind_speed_ms"
    if "soil temperature" in normalized and depth:
        return f"soil_temperature_{depth}cm_c"
    if "soil moisture" in normalized and depth:
        return f"soil_moisture_{depth}cm_pct"
    if "fuel temperature" in normalized:
        return "fuel_temperature_c"
    if "fuel moisture" in normalized:
        return "fuel_moisture_pct"
    if "snow depth" in normalized:
        return "snow_depth_m"
    if "temperature" in normalized:
        return "temperature_c"

    return slugify(label)


def make_unique(columns: Iterable[str]) -> list[str]:
    counts: Counter = Counter()
    unique = []
    for column in columns:
        counts[column] += 1
        unique.append(column if counts[column] == 1 else f"{column}_{counts[column]}")
    return unique


def parse_hourly_schema(readme_path: Path) -> tuple[list[str], list[dict]]:
    definitions = []
    for line in readme_path.read_text(encoding="utf-8", errors="replace").splitlines():
        match = README_COLUMN_PATTERN.match(line)
        if match:
            definitions.append((int(match.group(1)), match.group(2).strip()))

    if not definitions:
        raise ValueError("No numbered column definitions found")

    definitions.sort()
    expected_positions = list(range(1, definitions[-1][0] + 1))
    actual_positions = [position for position, _ in definitions]
    if actual_positions != expected_positions:
        raise ValueError(f"Column numbering is not contiguous: {actual_positions}")

    canonical = make_unique(
        canonical_column(label, position) for position, label in definitions
    )
    details = [
        {"position": position, "source_label": label, "column": column}
        for (position, label), column in zip(definitions, canonical)
    ]
    return canonical, details


def find_hourly_readme(station_dir: Path, station_id: str) -> Path | None:
    preferred = station_dir / f"{station_id}_HourlyData_README.txt"
    if preferred.is_file():
        return preferred

    station_prefix = station_id.lower()
    candidates = [
        path for path in station_dir.iterdir()
        if path.is_file()
        and path.suffix.lower() in {".txt", ".md"}
        and path.name.lower().startswith(station_prefix)
        and "hourlydata" in re.sub(r"[^a-z0-9]", "", path.stem.lower())
    ]
    candidates.sort(
        key=lambda path: (
            "readme" not in path.name.lower(),
            path.name.lower(),
        )
    )
    return candidates[0] if candidates else None


def find_station_metadata_readme(station_dir: Path, station_id: str) -> Path | None:
    preferred = station_dir / f"{station_id}_README.txt"
    if preferred.is_file():
        return preferred
    return None


def parse_station_metadata(readme_path: Path | None) -> dict:
    if readme_path is None:
        return {}

    text = readme_path.read_text(encoding="utf-8", errors="replace")
    metadata = {}
    patterns = {
        "latitude": r"(?im)^\s*Lat(?:itude)?\s*:\s*([-+]?\d+(?:\.\d+)?)",
        "longitude": r"(?im)^\s*Long(?:itude)?\s*:\s*([-+]?\d+(?:\.\d+)?)",
        "elevation": r"(?im)^\s*Elev(?:ation)?\s*:\s*([^\r\n]+)",
        "site_description": r"(?im)^\s*Site Description\s*:\s*([^\r\n]+)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        if not match:
            continue
        value = match.group(1).strip()
        metadata[key] = float(value) if key in {"latitude", "longitude"} else value
    return metadata


def iter_hourly_files(station_dir: Path) -> Iterable[Path]:
    for year_dir in sorted(station_dir.iterdir()):
        if not year_dir.is_dir() or not YEAR_PATTERN.match(year_dir.name):
            continue
        hourly_dirs = [
            path for path in year_dir.iterdir()
            if path.is_dir() and path.name.lower() == "hourly"
        ]
        for hourly_dir in hourly_dirs:
            yield from sorted(
                path for path in hourly_dir.iterdir()
                if path.is_file() and path.suffix.lower() in {".txt", ".csv"}
            )


def build_timestamp(values: dict[str, str]) -> datetime:
    return datetime(
        int(values["year"]),
        int(values["month"]),
        int(values["day"]),
        int(values["hour"]),
    )


def load_station_rows(
    station_dir: Path,
    station_id: str,
    columns: list[str],
    report: StationReport,
) -> dict[datetime, dict[str, str]]:
    rows_by_timestamp: dict[datetime, dict[str, str]] = {}
    required_time_columns = {"year", "month", "day", "hour"}
    if not required_time_columns.issubset(columns):
        raise ValueError(
            f"Schema is missing time columns: {sorted(required_time_columns - set(columns))}"
        )

    for source_path in iter_hourly_files(station_dir):
        report.files_seen += 1
        loaded_from_file = 0
        relative_source = source_path.relative_to(station_dir).as_posix()
        try:
            with source_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
                for raw_row in csv.reader(handle):
                    if not raw_row or not any(value.strip() for value in raw_row):
                        continue
                    if len(raw_row) != len(columns):
                        report.malformed_rows += 1
                        report.unexpected_column_counts[str(len(raw_row))] += 1
                        continue

                    values = dict(zip(columns, (value.strip() for value in raw_row)))
                    try:
                        timestamp = build_timestamp(values)
                    except (KeyError, TypeError, ValueError):
                        report.timestamp_errors += 1
                        continue

                    normalized = {
                        "station_id": station_id,
                        "timestamp": timestamp.isoformat(timespec="seconds"),
                        "source_file": relative_source,
                    }
                    normalized.update(
                        (column, values[column])
                        for column in columns
                        if column not in required_time_columns
                    )
                    if timestamp in rows_by_timestamp:
                        report.duplicate_timestamps += 1
                    rows_by_timestamp[timestamp] = normalized
                    loaded_from_file += 1
        except OSError as error:
            report.warnings.append(f"Could not read {relative_source}: {error}")
            continue

        if loaded_from_file:
            report.files_loaded += 1
            report.rows_loaded += loaded_from_file

    return rows_by_timestamp


def write_csv(path: Path, rows: list[dict[str, str]], fields: list[str], gzip_output: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    opener = gzip.open if gzip_output else open
    with opener(path, "wt", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def process_station(
    station_dir: Path,
    output_dir: Path,
    rolling_days: int,
    timezone_label: str,
) -> tuple[dict, StationReport]:
    station_id = station_dir.name.upper()
    report = StationReport(station_id=station_id)
    readme_path = find_hourly_readme(station_dir, station_id)
    metadata = parse_station_metadata(find_station_metadata_readme(station_dir, station_id))

    station_manifest = {
        "station_id": station_id,
        "timezone": timezone_label,
        **metadata,
        "variables": [],
        "years": [],
        "latest_timestamp": None,
        "latest_file": None,
    }

    if readme_path is None:
        report.status = "skipped"
        report.warnings.append("Hourly README not found")
        return station_manifest, report

    report.schema_file = readme_path.name
    try:
        columns, schema_details = parse_hourly_schema(readme_path)
    except (OSError, ValueError) as error:
        report.status = "skipped"
        report.warnings.append(f"Could not parse hourly schema: {error}")
        return station_manifest, report

    measurement_columns = [
        column for column in columns if column not in {"year", "month", "day", "hour"}
    ]
    output_fields = ["station_id", "timestamp", *measurement_columns, "source_file"]
    schema_payload = {
        "station_id": station_id,
        "source_readme": readme_path.name,
        "timezone": timezone_label,
        "output_columns": output_fields,
        "source_columns": schema_details,
    }
    write_json(output_dir / "schemas" / f"{station_id}.json", schema_payload)

    try:
        rows_by_timestamp = load_station_rows(station_dir, station_id, columns, report)
    except ValueError as error:
        report.status = "skipped"
        report.warnings.append(str(error))
        return station_manifest, report

    sorted_items = sorted(rows_by_timestamp.items())
    rows_by_year: dict[int, list[dict[str, str]]] = {}
    for timestamp, row in sorted_items:
        rows_by_year.setdefault(timestamp.year, []).append(row)

    for year, rows in sorted(rows_by_year.items()):
        write_csv(
            output_dir / "hourly" / station_id / f"{year}.csv.gz",
            rows,
            output_fields,
            gzip_output=True,
        )

    if sorted_items:
        latest_timestamp = sorted_items[-1][0]
        cutoff = latest_timestamp - timedelta(days=rolling_days)
        rolling_rows = [row for timestamp, row in sorted_items if timestamp >= cutoff]
        latest_relative_path = f"hourly/{station_id}/latest_{rolling_days}d.csv"
        write_csv(
            output_dir / latest_relative_path,
            rolling_rows,
            output_fields,
            gzip_output=False,
        )
        station_manifest.update(
            {
                "years": sorted(rows_by_year),
                "latest_timestamp": latest_timestamp.isoformat(timespec="seconds"),
                "latest_file": latest_relative_path,
            }
        )

    station_manifest["variables"] = measurement_columns
    if report.malformed_rows or report.timestamp_errors:
        report.status = "warning"
    return station_manifest, report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Raw archive root")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Normalized output root")
    parser.add_argument(
        "--rolling-days",
        type=int,
        default=183,
        help="Days in each latest CSV (default: 183, approximately six months)",
    )
    parser.add_argument(
        "--timezone",
        default="source-local-unspecified",
        help="Timezone metadata label; timestamps remain source-local and offset-free",
    )
    parser.add_argument(
        "--stations",
        nargs="*",
        help="Optional station IDs to process; defaults to every station directory",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input.resolve()
    output_dir = args.output.resolve()

    if args.rolling_days < 1:
        print("--rolling-days must be at least 1", file=sys.stderr)
        return 2
    if not input_dir.is_dir():
        print(f"Input directory does not exist: {input_dir}", file=sys.stderr)
        return 2

    requested = {station.upper() for station in args.stations} if args.stations else None
    station_dirs = sorted(
        path for path in input_dir.iterdir()
        if path.is_dir() and (requested is None or path.name.upper() in requested)
    )

    manifests = []
    reports = []
    for station_dir in station_dirs:
        manifest, report = process_station(
            station_dir,
            output_dir,
            args.rolling_days,
            args.timezone,
        )
        manifests.append(manifest)
        reports.append(report)
        print(
            f"{report.station_id}: {report.status}; "
            f"{report.rows_loaded} rows from {report.files_loaded}/{report.files_seen} files"
        )

    stations_payload = {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source_root": str(input_dir),
        "rolling_days": args.rolling_days,
        "timezone": args.timezone,
        "stations": manifests,
    }
    report_payload = {
        "generated_at": stations_payload["generated_at"],
        "stations_processed": len(reports),
        "status_counts": dict(Counter(report.status for report in reports)),
        "stations": [report.as_dict() for report in reports],
    }
    write_json(output_dir / "stations.json", stations_payload)
    write_json(output_dir / "processing_report.json", report_payload)

    print(f"Wrote normalized output to {output_dir}")
    return 0 if reports else 1


if __name__ == "__main__":
    raise SystemExit(main())
