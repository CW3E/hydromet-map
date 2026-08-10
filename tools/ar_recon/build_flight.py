#!/usr/bin/env python3
"""Convert an AR Recon aircraft directory into browser-friendly 3D flight data."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from typing import Any, Iterable, Sequence


SCHEMA_VERSION = "1.0.0"
DEFAULT_GAP_SECONDS = 90
MISSING_SENTINELS = {-999.0, -9999.0}
TIME_UNITS_PATTERN = re.compile(
    r"seconds\s+since\s+(?P<timestamp>.+?)(?:\s+UTC|Z)?$",
    re.IGNORECASE,
)
HDOBS_DATE_PATTERN = re.compile(r"\bHDOB\s+\d+\s+(?P<date>\d{8})\b")
HDOBS_HEADER_PATTERN = re.compile(
    r"^(?P<platform>\S+)\s+(?P<mission>\S+)\s+(?P<iop>IOP\d+)\s+HDOB\b"
)
HDOBS_ROW_PATTERN = re.compile(
    r"^(?P<clock>\d{6})\s+"
    r"(?P<lat>\d{4}[NS])\s+"
    r"(?P<lon>\d{5}[EW])\s+"
    r"(?P<pressure>\d{4}|////)\s+"
    r"(?P<altitude>\d{5}|/////)\s+"
    r"(?P<d_value>[+-]?\d{4}|////)\s+"
    r"(?P<temperature>[+-]\d{3}|////)\s+"
    r"(?P<dew_point>[+-]\d{3}|////)\s+"
    r"(?P<wind>\d{6}|//////)"
)
SONDE_VARIABLES = {
    "pressureHpa": "pres",
    "temperatureC": "tdry",
    "dewPointC": "dp",
    "relativeHumidityPercent": "rh",
    "eastwardWindMps": "u_wind",
    "northwardWindMps": "v_wind",
    "upwardAirVelocityMps": "w_wind",
    "windSpeedMps": "wspd",
    "windDirectionDegrees": "wdir",
    "verticalVelocityMps": "dz",
    "mixingRatioGkg": "mr",
    "virtualTemperatureK": "vt",
    "potentialTemperatureK": "theta",
    "equivalentPotentialTemperatureK": "theta_e",
    "virtualPotentialTemperatureK": "theta_v",
}
VARIABLE_METADATA = {
    "longitude": {"units": "degrees_east"},
    "latitude": {"units": "degrees_north"},
    "altitudeMslMeters": {"units": "m", "positive": "up"},
    "pressureHpa": {"units": "hPa"},
    "temperatureC": {"units": "degC"},
    "dewPointC": {"units": "degC"},
    "relativeHumidityPercent": {"units": "%"},
    "eastwardWindMps": {"units": "m/s"},
    "northwardWindMps": {"units": "m/s"},
    "upwardAirVelocityMps": {"units": "m/s"},
    "windSpeedMps": {"units": "m/s"},
    "windSpeedKnots": {"units": "kn"},
    "windDirectionDegrees": {"units": "degree"},
    "verticalVelocityMps": {"units": "m/s"},
    "mixingRatioGkg": {"units": "g/kg"},
    "virtualTemperatureK": {"units": "K"},
    "potentialTemperatureK": {"units": "K"},
    "equivalentPotentialTemperatureK": {"units": "K"},
    "virtualPotentialTemperatureK": {"units": "K"},
}


@dataclass
class Point:
    timestamp: datetime
    longitude: float
    latitude: float
    altitude_msl_meters: float
    measurements: dict[str, float | None] = field(default_factory=dict)
    source_file: str | None = None


@dataclass
class Sonde:
    sonde_id: str
    source_file: str
    launch_time: datetime
    points: list[Point]
    metadata: dict[str, Any]
    reference_position: tuple[float, float, float] | None = None


@dataclass
class ProcessingReport:
    hdobs_files_seen: int = 0
    hdobs_files_loaded: int = 0
    hdobs_rows_loaded: int = 0
    hdobs_rows_skipped: int = 0
    duplicate_aircraft_timestamps: int = 0
    sonde_files_seen: int = 0
    sonde_files_loaded: int = 0
    sonde_rows_loaded: int = 0
    sonde_rows_skipped: int = 0
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return vars(self).copy()


def utc_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def finite_number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(result) or result in MISSING_SENTINELS:
        return None
    return result


def scalar(value: Any) -> Any:
    if hasattr(value, "item"):
        try:
            return value.item()
        except (ValueError, AttributeError):
            pass
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return scalar(value[0]) if len(value) else None
    return value


def parse_time_origin(units: str) -> datetime:
    match = TIME_UNITS_PATTERN.search(units.strip())
    if not match:
        raise ValueError(f"Unsupported time units: {units!r}")
    timestamp = match.group("timestamp").strip()
    timestamp = re.sub(r"\s+UTC$", "", timestamp, flags=re.IGNORECASE)
    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=parsed.tzinfo or UTC).astimezone(UTC)


def parse_coordinate(value: str) -> float:
    hemisphere = value[-1]
    digits = value[:-1]
    degree_digits = 2 if hemisphere in "NS" else 3
    degrees = int(digits[:degree_digits])
    minutes = int(digits[degree_digits:])
    if minutes >= 60:
        raise ValueError(f"Invalid coordinate minutes in {value!r}")
    result = degrees + minutes / 60
    return -result if hemisphere in "SW" else result


def parse_tenths(value: str) -> float | None:
    if "/" in value:
        return None
    return int(value) / 10


def parse_pressure(value: str) -> float | None:
    pressure = parse_tenths(value)
    if pressure is not None and pressure < 100:
        pressure += 1000
    return pressure


def parse_hdobs_timestamp(day: date, clock: str, anchor: datetime | None = None) -> datetime:
    parsed_time = time(int(clock[:2]), int(clock[2:4]), int(clock[4:]))
    candidate = datetime.combine(day, parsed_time, tzinfo=UTC)
    if anchor is None:
        return candidate
    candidates = [candidate - timedelta(days=1), candidate, candidate + timedelta(days=1)]
    return min(candidates, key=lambda value: abs((value - anchor).total_seconds()))


def parse_hdobs_file(path: Path, report: ProcessingReport) -> tuple[list[Point], dict[str, str]]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    report_date = None
    metadata: dict[str, str] = {}
    for line in lines:
        date_match = HDOBS_DATE_PATTERN.search(line)
        if date_match:
            report_date = datetime.strptime(date_match.group("date"), "%Y%m%d").date()
        header_match = HDOBS_HEADER_PATTERN.match(line.strip())
        if header_match:
            metadata.update(header_match.groupdict())
    if report_date is None:
        filename_date = re.search(r"\.(\d{8})\d{4}\.txt$", path.name, re.IGNORECASE)
        if not filename_date:
            raise ValueError("HDOBS report date was not found")
        report_date = datetime.strptime(filename_date.group(1), "%Y%m%d").date()
    filename_timestamp = re.search(r"\.(?P<stamp>\d{12})\.txt$", path.name, re.IGNORECASE)
    report_anchor = (
        datetime.strptime(filename_timestamp.group("stamp"), "%Y%m%d%H%M").replace(tzinfo=UTC)
        if filename_timestamp
        else None
    )

    points: list[Point] = []
    for line in lines:
        match = HDOBS_ROW_PATTERN.match(line.strip())
        if not match:
            continue
        fields = match.groupdict()
        altitude = finite_number(fields["altitude"].replace("/", "")) if "/" not in fields["altitude"] else None
        if altitude is None:
            report.hdobs_rows_skipped += 1
            continue
        try:
            longitude = parse_coordinate(fields["lon"])
            latitude = parse_coordinate(fields["lat"])
            timestamp = parse_hdobs_timestamp(report_date, fields["clock"], report_anchor)
        except ValueError:
            report.hdobs_rows_skipped += 1
            continue
        wind_direction = wind_speed = None
        if "/" not in fields["wind"]:
            wind_direction = finite_number(fields["wind"][:3])
            wind_speed = finite_number(fields["wind"][3:])
        points.append(
            Point(
                timestamp=timestamp,
                longitude=longitude,
                latitude=latitude,
                altitude_msl_meters=altitude,
                measurements={
                    "pressureHpa": parse_pressure(fields["pressure"]),
                    "temperatureC": parse_tenths(fields["temperature"]),
                    "dewPointC": parse_tenths(fields["dew_point"]),
                    "windDirectionDegrees": wind_direction,
                    "windSpeedKnots": wind_speed,
                },
                source_file=path.relative_to(path.parent.parent).as_posix(),
            )
        )
    return points, metadata


def discover_hdobs_files(input_dir: Path) -> list[Path]:
    hdobs_dirs = [path for path in input_dir.rglob("*") if path.is_dir() and path.name.lower() == "hdobs"]
    return sorted(
        path
        for directory in hdobs_dirs
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() == ".txt"
    )


def discover_sonde_files(input_dir: Path) -> list[Path]:
    candidates = []
    for path in input_dir.rglob("*"):
        name = path.name.lower()
        if path.is_file() and path.suffix.lower() == ".nc" and "qc" in name:
            candidates.append(path)
    return sorted(candidates)


def load_aircraft_track(
    input_dir: Path,
    report: ProcessingReport,
) -> tuple[list[Point], dict[str, list[str]]]:
    by_timestamp: dict[datetime, Point] = {}
    metadata_values: dict[str, set[str]] = {"platform": set(), "mission": set(), "iop": set()}
    files = discover_hdobs_files(input_dir)
    report.hdobs_files_seen = len(files)
    for path in files:
        try:
            points, metadata = parse_hdobs_file(path, report)
        except (OSError, ValueError) as error:
            report.warnings.append(f"Could not parse {path.relative_to(input_dir)}: {error}")
            continue
        if points:
            report.hdobs_files_loaded += 1
        report.hdobs_rows_loaded += len(points)
        for key in metadata_values:
            if metadata.get(key):
                metadata_values[key].add(metadata[key])
        for point in points:
            if point.timestamp in by_timestamp:
                report.duplicate_aircraft_timestamps += 1
            by_timestamp[point.timestamp] = point
    return sorted(by_timestamp.values(), key=lambda point: point.timestamp), {
        key: sorted(values) for key, values in metadata_values.items()
    }


def import_netcdf4() -> Any:
    try:
        import netCDF4  # type: ignore
    except ImportError as error:
        raise RuntimeError(
            "The netCDF4 package is required. Install tools/ar_recon/requirements.txt first."
        ) from error
    return netCDF4


def dataset_attribute(dataset: Any, name: str, default: Any = None) -> Any:
    return scalar(getattr(dataset, name, default))


def variable_values(dataset: Any, name: str) -> list[Any]:
    if name not in dataset.variables:
        return []
    values = dataset.variables[name][:]
    if hasattr(values, "filled"):
        values = values.filled(float("nan"))
    if hasattr(values, "tolist"):
        values = values.tolist()
    if not isinstance(values, list):
        values = [values]
    return values


def variable_scalar(dataset: Any, name: str) -> float | None:
    values = variable_values(dataset, name)
    return finite_number(scalar(values))


def load_sonde(path: Path, input_dir: Path, netcdf4: Any, report: ProcessingReport) -> Sonde:
    with netcdf4.Dataset(path, "r") as dataset:
        required = {"time", "lat", "lon"}
        if not required.issubset(dataset.variables):
            raise ValueError(f"missing variables: {sorted(required - set(dataset.variables))}")
        altitude_name = "alt" if "alt" in dataset.variables else "gpsalt"
        if altitude_name not in dataset.variables:
            raise ValueError("missing both alt and gpsalt variables")
        origin = parse_time_origin(dataset.variables["time"].units)
        raw = {
            "time": variable_values(dataset, "time"),
            "latitude": variable_values(dataset, "lat"),
            "longitude": variable_values(dataset, "lon"),
            "altitudeMslMeters": variable_values(dataset, altitude_name),
        }
        for output_name, source_name in SONDE_VARIABLES.items():
            raw[output_name] = variable_values(dataset, source_name)
        row_count = min(len(raw[name]) for name in ("time", "latitude", "longitude", "altitudeMslMeters"))
        points = []
        for index in range(row_count):
            seconds = finite_number(raw["time"][index])
            latitude = finite_number(raw["latitude"][index])
            longitude = finite_number(raw["longitude"][index])
            altitude = finite_number(raw["altitudeMslMeters"][index])
            if seconds is None or latitude is None or longitude is None or altitude is None:
                report.sonde_rows_skipped += 1
                continue
            if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                report.sonde_rows_skipped += 1
                continue
            measurements = {
                name: finite_number(values[index]) if index < len(values) else None
                for name, values in raw.items()
                if name not in {"time", "latitude", "longitude", "altitudeMslMeters"}
            }
            points.append(
                Point(
                    timestamp=origin + timedelta(seconds=seconds),
                    longitude=longitude,
                    latitude=latitude,
                    altitude_msl_meters=altitude,
                    measurements=measurements,
                    source_file=path.relative_to(input_dir).as_posix(),
                )
            )
        if not points:
            raise ValueError("no rows with valid time/latitude/longitude/altitude")
        points.sort(key=lambda point: point.timestamp)
        sonde_id = str(dataset_attribute(dataset, "SondeId", path.stem))
        reference_lon = variable_scalar(dataset, "reference_lon")
        reference_lat = variable_scalar(dataset, "reference_lat")
        reference_alt = variable_scalar(dataset, "reference_alt")
        reference_position = None
        if reference_lon is not None and reference_lat is not None and reference_alt is not None:
            reference_position = (reference_lon, reference_lat, reference_alt)
        metadata = {
            "flight": dataset_attribute(dataset, "Flight"),
            "project": dataset_attribute(dataset, "Project"),
            "platformId": dataset_attribute(dataset, "PlatformId"),
            "platformType": dataset_attribute(dataset, "PlatformType"),
            "agency": dataset_attribute(dataset, "Agency"),
            "sondeModel": dataset_attribute(dataset, "SondeModel"),
            "comment": dataset_attribute(dataset, "Comment"),
            "altitudeSourceVariable": altitude_name,
        }
        return Sonde(
            sonde_id=sonde_id,
            source_file=path.relative_to(input_dir).as_posix(),
            launch_time=origin,
            points=points,
            metadata={key: value for key, value in metadata.items() if value not in (None, "")},
            reference_position=reference_position,
        )


def load_sondes(input_dir: Path, report: ProcessingReport) -> list[Sonde]:
    files = discover_sonde_files(input_dir)
    report.sonde_files_seen = len(files)
    if not files:
        return []
    netcdf4 = import_netcdf4()
    sondes = []
    used_ids: Counter[str] = Counter()
    for path in files:
        try:
            sonde = load_sonde(path, input_dir, netcdf4, report)
        except (OSError, ValueError, RuntimeError) as error:
            report.warnings.append(f"Could not parse {path.relative_to(input_dir)}: {error}")
            continue
        used_ids[sonde.sonde_id] += 1
        if used_ids[sonde.sonde_id] > 1:
            original = sonde.sonde_id
            sonde.sonde_id = f"{original}-{used_ids[original]}"
            report.warnings.append(
                f"Duplicate sonde ID {original!r}; wrote the later record as {sonde.sonde_id!r}"
            )
        sondes.append(sonde)
        report.sonde_files_loaded += 1
        report.sonde_rows_loaded += len(sonde.points)
    return sorted(sondes, key=lambda sonde: sonde.launch_time)


def infer_flight_id(sondes: Sequence[Sonde], input_dir: Path) -> str:
    flight_values = [str(sonde.metadata["flight"]) for sonde in sondes if sonde.metadata.get("flight")]
    if flight_values:
        flight = Counter(flight_values).most_common(1)[0][0]
        noaa_match = re.search(r"\b\d{8}N\d+\b", flight)
        if noaa_match:
            return noaa_match.group(0)
        af_match = re.match(r"\d{11}", flight)
        if af_match:
            return af_match.group(0)
        return slugify(flight)
    return slugify(input_dir.name)


def slugify(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-") or "flight"


def segment_ranges(points: Sequence[Point], gap_seconds: int) -> list[list[int]]:
    if not points:
        return []
    ranges = []
    start = 0
    for index in range(1, len(points)):
        if (points[index].timestamp - points[index - 1].timestamp).total_seconds() > gap_seconds:
            if index - start >= 2:
                ranges.append([start, index])
            start = index
    if len(points) - start >= 2:
        ranges.append([start, len(points)])
    return ranges


def numeric_range(values: Iterable[float | None]) -> list[float] | None:
    finite = [value for value in values if value is not None and math.isfinite(value)]
    return [min(finite), max(finite)] if finite else None


def points_payload(points: Sequence[Point], origin: datetime, gap_seconds: int) -> dict[str, Any]:
    measurement_names = sorted({name for point in points for name in point.measurements})
    payload = {
        "pointCount": len(points),
        "segments": segment_ranges(points, gap_seconds),
        "coordinates": {
            "timeOffsetSeconds": [round((point.timestamp - origin).total_seconds(), 3) for point in points],
            "longitude": [round(point.longitude, 6) for point in points],
            "latitude": [round(point.latitude, 6) for point in points],
            "altitudeMslMeters": [round(point.altitude_msl_meters, 2) for point in points],
        },
        "measurements": {
            name: [
                round(value, 4) if (value := point.measurements.get(name)) is not None else None
                for point in points
            ]
            for name in measurement_names
        },
    }
    return payload


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lon1, lat1 = map(math.radians, a)
    lon2, lat2 = map(math.radians, b)
    delta_lon = lon2 - lon1
    delta_lat = lat2 - lat1
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def match_aircraft(sonde: Sonde, aircraft: Sequence[Point]) -> dict[str, Any] | None:
    if not aircraft:
        return None
    nearest = min(aircraft, key=lambda point: abs((point.timestamp - sonde.launch_time).total_seconds()))
    reference = sonde.reference_position
    if reference is None:
        launch_point = min(sonde.points, key=lambda point: abs((point.timestamp - sonde.launch_time).total_seconds()))
        reference = (launch_point.longitude, launch_point.latitude, launch_point.altitude_msl_meters)
    return {
        "aircraftTimestamp": utc_iso(nearest.timestamp),
        "timeDeltaSeconds": round((nearest.timestamp - sonde.launch_time).total_seconds(), 1),
        "horizontalDistanceKm": round(
            haversine_km((reference[0], reference[1]), (nearest.longitude, nearest.latitude)), 2
        ),
        "altitudeDeltaMeters": round(nearest.altitude_msl_meters - reference[2], 1),
    }


def collect_bounds(groups: Iterable[Sequence[Point]]) -> dict[str, list[float] | None]:
    points = [point for group in groups for point in group]
    return {
        "longitude": numeric_range(point.longitude for point in points),
        "latitude": numeric_range(point.latitude for point in points),
        "altitudeMslMeters": numeric_range(point.altitude_msl_meters for point in points),
    }


def variable_manifest(groups: Iterable[Sequence[Point]]) -> dict[str, dict[str, Any]]:
    points = [point for group in groups for point in group]
    names = sorted({name for point in points for name in point.measurements})
    return {
        name: {
            **VARIABLE_METADATA.get(name, {}),
            "range": numeric_range(point.measurements.get(name) for point in points),
        }
        for name in names
    }


def write_json(path: Path, value: Any, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, separators=(",", ":") if compact else None, indent=None if compact else 2)
        + "\n",
        encoding="utf-8",
    )


def build_flight(
    input_dir: Path,
    output_dir: Path,
    flight_id: str | None = None,
    gap_seconds: int = DEFAULT_GAP_SECONDS,
    compact: bool = False,
) -> tuple[dict[str, Any], ProcessingReport]:
    report = ProcessingReport()
    aircraft, hdobs_metadata = load_aircraft_track(input_dir, report)
    sondes = load_sondes(input_dir, report)
    if not aircraft and not sondes:
        raise ValueError("No usable HDOBS points or QC NetCDF sondes were found")

    all_times = [point.timestamp for point in aircraft]
    all_times.extend(point.timestamp for sonde in sondes for point in sonde.points)
    origin = min(all_times)
    end = max(all_times)
    resolved_flight_id = flight_id or infer_flight_id(sondes, input_dir)
    sonde_index = []

    for sonde in sondes:
        filename = f"{slugify(sonde.sonde_id)}.json"
        match = match_aircraft(sonde, aircraft)
        payload = {
            "schemaVersion": SCHEMA_VERSION,
            "flightId": resolved_flight_id,
            "id": sonde.sonde_id,
            "launchTime": utc_iso(sonde.launch_time),
            "sourceFile": sonde.source_file,
            "metadata": sonde.metadata,
            "referencePosition": (
                {
                    "longitude": round(sonde.reference_position[0], 6),
                    "latitude": round(sonde.reference_position[1], 6),
                    "altitudeMslMeters": round(sonde.reference_position[2], 2),
                }
                if sonde.reference_position
                else None
            ),
            "aircraftMatch": match,
            **points_payload(sonde.points, origin, gap_seconds),
        }
        write_json(output_dir / "sondes" / filename, payload, compact)
        sonde_index.append(
            {
                "id": sonde.sonde_id,
                "launchTime": utc_iso(sonde.launch_time),
                "pointCount": len(sonde.points),
                "file": f"sondes/{filename}",
                "sourceFile": sonde.source_file,
                "aircraftMatch": match,
            }
        )

    aircraft_payload = {
        "schemaVersion": SCHEMA_VERSION,
        "flightId": resolved_flight_id,
        "source": "HDOBS",
        **points_payload(aircraft, origin, gap_seconds),
    }
    write_json(output_dir / "aircraft.json", aircraft_payload, compact)
    write_json(
        output_dir / "sondes" / "index.json",
        {"schemaVersion": SCHEMA_VERSION, "flightId": resolved_flight_id, "sondes": sonde_index},
        compact,
    )

    point_groups = [aircraft, *(sonde.points for sonde in sondes)]
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "flightId": resolved_flight_id,
        "originTime": utc_iso(origin),
        "endTime": utc_iso(end),
        "inputDirectory": input_dir.name,
        "platforms": hdobs_metadata["platform"],
        "missions": hdobs_metadata["mission"],
        "iops": hdobs_metadata["iop"],
        "bounds": collect_bounds(point_groups),
        "aircraft": {
            "file": "aircraft.json",
            "pointCount": len(aircraft),
            "segmentCount": len(segment_ranges(aircraft, gap_seconds)),
        },
        "sondes": {"indexFile": "sondes/index.json", "count": len(sondes)},
        "variables": variable_manifest(point_groups),
    }
    write_json(output_dir / "manifest.json", manifest, compact)
    write_json(output_dir / "processing_report.json", report.as_dict(), compact=False)
    return manifest, report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Aircraft directory containing HDOBS and QC NetCDF files")
    parser.add_argument("--output", required=True, type=Path, help="Output directory for the converted flight bundle")
    parser.add_argument("--flight-id", help="Stable output ID; inferred from NetCDF metadata when omitted")
    parser.add_argument(
        "--gap-seconds",
        type=int,
        default=DEFAULT_GAP_SECONDS,
        help=f"Start a new rendered segment after a larger time gap (default: {DEFAULT_GAP_SECONDS})",
    )
    parser.add_argument("--compact", action="store_true", help="Write compact JSON instead of indented JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input.resolve()
    output_dir = args.output.resolve()
    if not input_dir.is_dir():
        print(f"Input directory does not exist: {input_dir}", file=sys.stderr)
        return 2
    if args.gap_seconds < 1:
        print("--gap-seconds must be at least 1", file=sys.stderr)
        return 2
    try:
        manifest, report = build_flight(
            input_dir,
            output_dir,
            flight_id=args.flight_id,
            gap_seconds=args.gap_seconds,
            compact=args.compact,
        )
    except (OSError, RuntimeError, ValueError) as error:
        print(f"Conversion failed: {error}", file=sys.stderr)
        return 1
    print(
        f"{manifest['flightId']}: {manifest['aircraft']['pointCount']} aircraft points, "
        f"{manifest['sondes']['count']} sondes, {report.sonde_rows_loaded} sonde points"
    )
    if report.warnings:
        print(f"Completed with {len(report.warnings)} warning(s); see processing_report.json")
    print(f"Wrote flight bundle to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
