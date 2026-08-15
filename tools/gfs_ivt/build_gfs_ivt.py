#!/usr/bin/env python3
"""Download GFS pressure-level fields, derive IVT, and pack it for WebGL."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import math
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import cfgrib
import numpy as np
import requests
import xarray as xr
from PIL import Image


NOMADS_FILTER_URL = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl"
AWS_GFS_ROOT = "https://noaa-gfs-bdp-pds.s3.amazonaws.com"
NCEI_ROOT = "https://www.ncei.noaa.gov/thredds/fileServer"
GRAVITY = 9.80665
PRESSURE_LEVELS_HPA = (
    1000, 975, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500,
    450, 400, 350, 300,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", required=True, help="GFS initialization date, YYYYMMDD")
    parser.add_argument("--cycle", default="00", choices=("00", "06", "12", "18"))
    parser.add_argument(
        "--hours", default="0:48:3",
        help="Forecast hours: colon range start:stop:step (inclusive) or comma list",
    )
    parser.add_argument("--output", type=Path, default=Path("gfs-ivt-webgl"))
    parser.add_argument(
        "--source", choices=("auto", "nomads", "aws", "ncei"), default="auto",
        help="Data source; auto tries NOMADS, AWS, then the NCEI archive",
    )
    parser.add_argument("--north", type=float, default=70.0)
    parser.add_argument("--south", type=float, default=10.0)
    parser.add_argument("--west", type=float, default=-180.0)
    parser.add_argument("--east", type=float, default=-100.0)
    parser.add_argument(
        "--component-limit", type=float, default=2000.0,
        help="Symmetric IVT component encoding limit in kg m-1 s-1",
    )
    parser.add_argument("--timeout", type=float, default=300.0)
    parser.add_argument("--retries", type=int, default=4)
    parser.add_argument(
        "--download-workers", type=int, default=8,
        help="Parallel HTTP range requests used for AWS indexed downloads",
    )
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--delete-grib", action="store_true")
    return parser.parse_args()


def parse_hours(value: str) -> list[int]:
    if ":" in value:
        parts = [int(item) for item in value.split(":")]
        if len(parts) != 3:
            raise ValueError("--hours range must be start:stop:step")
        start, stop, step = parts
        if start < 0 or stop < start or step <= 0:
            raise ValueError("invalid --hours range")
        return list(range(start, stop + 1, step))
    hours = sorted({int(item) for item in value.split(",") if item.strip()})
    if not hours or hours[0] < 0:
        raise ValueError("--hours must contain non-negative forecast hours")
    return hours


def validate_args(args: argparse.Namespace) -> datetime:
    try:
        init_time = datetime.strptime(args.date + args.cycle, "%Y%m%d%H").replace(
            tzinfo=timezone.utc,
        )
    except ValueError as exc:
        raise ValueError("--date must be YYYYMMDD") from exc
    if not (-90 <= args.south < args.north <= 90):
        raise ValueError("latitude bounds must satisfy -90 <= south < north <= 90")
    if not (-180 <= args.west <= 180 and -180 <= args.east <= 180):
        raise ValueError("longitude bounds must each be between -180 and 180")
    if math.isclose(args.west, args.east, abs_tol=1e-6):
        raise ValueError("longitude bounds must describe a non-zero domain")
    longitude_span = (
        args.east - args.west
        if args.east > args.west
        else args.east + 360.0 - args.west
    )
    if not is_global_domain(args) and longitude_span <= 0:
        raise ValueError("longitude bounds must describe a positive west-to-east span")
    if args.component_limit <= 0:
        raise ValueError("--component-limit must be positive")
    if args.download_workers <= 0:
        raise ValueError("--download-workers must be positive")
    return init_time


def nomads_longitude(longitude: float) -> float:
    return longitude % 360.0


def is_global_domain(args: argparse.Namespace) -> bool:
    return math.isclose(args.east - args.west, 360.0, abs_tol=1e-6)


def crosses_dateline(args: argparse.Namespace) -> bool:
    return not is_global_domain(args) and args.west > args.east


def build_download_url(
    args: argparse.Namespace,
    forecast_hour: int,
    *,
    surface_only: bool = False,
) -> str:
    params: list[tuple[str, str]] = [
        ("file", f"gfs.t{args.cycle}z.pgrb2.0p25.f{forecast_hour:03d}"),
    ]
    if surface_only:
        params.extend((("lev_surface", "on"), ("var_PRES", "on")))
    else:
        params.extend((f"lev_{level}_mb", "on") for level in PRESSURE_LEVELS_HPA)
        params.extend((("var_SPFH", "on"), ("var_UGRD", "on"), ("var_VGRD", "on")))
    left_longitude = 0.0 if is_global_domain(args) else nomads_longitude(args.west)
    right_longitude = 360.0 if is_global_domain(args) else nomads_longitude(args.east)
    params.extend(
        (
            ("subregion", ""),
            ("toplat", f"{args.north:g}"),
            ("leftlon", f"{left_longitude:g}"),
            ("rightlon", f"{right_longitude:g}"),
            ("bottomlat", f"{args.south:g}"),
            ("dir", f"/gfs.{args.date}/{args.cycle}/atmos"),
        )
    )
    return NOMADS_FILTER_URL + "?" + urlencode(params)


def download(url: str, destination: Path, timeout: float, retries: int) -> None:
    temporary = destination.with_suffix(destination.suffix + ".part")
    for attempt in range(1, retries + 1):
        try:
            with requests.get(url, stream=True, timeout=(30, timeout)) as response:
                response.raise_for_status()
                with temporary.open("wb") as output:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            output.write(chunk)
            with temporary.open("rb") as source:
                if source.read(4) != b"GRIB":
                    raise RuntimeError("NOAA response is not a GRIB file")
            temporary.replace(destination)
            return
        except (requests.RequestException, OSError, RuntimeError) as exc:
            temporary.unlink(missing_ok=True)
            if attempt == retries:
                raise RuntimeError(f"download failed after {retries} attempts: {exc}") from exc
            delay = min(30, 2 ** attempt)
            print(f"  attempt {attempt} failed; retrying in {delay}s: {exc}", file=sys.stderr)
            time.sleep(delay)


def aws_object_url(args: argparse.Namespace, forecast_hour: int) -> str:
    filename = f"gfs.t{args.cycle}z.pgrb2.0p25.f{forecast_hour:03d}"
    return f"{AWS_GFS_ROOT}/gfs.{args.date}/{args.cycle}/atmos/{filename}"


def parse_gfs_index(index_text: str) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for line in index_text.splitlines():
        parts = line.split(":")
        if len(parts) < 5 or not parts[0].isdigit() or not parts[1].isdigit():
            continue
        records.append({
            "number": int(parts[0]),
            "offset": int(parts[1]),
            "variable": parts[3].upper(),
            "level": parts[4].lower(),
        })
    if not records:
        raise RuntimeError("AWS GFS index contained no recognizable records")
    for index, record in enumerate(records[:-1]):
        record["end"] = int(records[index + 1]["offset"]) - 1
    records[-1]["end"] = None
    return records


def select_ivt_records(
    records: list[dict[str, object]],
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    wanted_levels = {f"{level} mb" for level in PRESSURE_LEVELS_HPA}
    pressure = [
        record for record in records
        if record["variable"] in {"SPFH", "UGRD", "VGRD"}
        and record["level"] in wanted_levels
    ]
    surface = [
        record for record in records
        if record["variable"] in {"PRES", "SP"}
        and record["level"] == "surface"
    ]
    expected = len(PRESSURE_LEVELS_HPA) * 3
    if len(pressure) != expected:
        found = {(str(item["variable"]), str(item["level"])) for item in pressure}
        raise RuntimeError(
            f"AWS GFS index supplied {len(pressure)} of {expected} required "
            f"pressure-level records; found {len(found)} unique variable/level pairs",
        )
    if not surface:
        raise RuntimeError("AWS GFS index is missing PRES at the surface")
    return pressure, [surface[0]]


def fetch_range(
    url: str,
    record: dict[str, object],
    timeout: float,
    retries: int,
) -> tuple[int, bytes]:
    start = int(record["offset"])
    end = record["end"]
    range_value = f"bytes={start}-{'' if end is None else int(end)}"
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(
                url,
                headers={"Range": range_value},
                timeout=(30, timeout),
            )
            response.raise_for_status()
            if response.status_code != 206:
                raise RuntimeError(
                    f"server ignored byte range {range_value} (status {response.status_code})",
                )
            payload = response.content
            if not payload.startswith(b"GRIB"):
                raise RuntimeError(f"byte range {range_value} is not a GRIB message")
            return int(record["number"]), payload
        except (requests.RequestException, RuntimeError) as exc:
            if attempt == retries:
                raise RuntimeError(f"range {range_value} failed: {exc}") from exc
            time.sleep(min(30, 2 ** attempt))
    raise AssertionError("unreachable")


def download_aws_records(
    url: str,
    records: list[dict[str, object]],
    destination: Path,
    args: argparse.Namespace,
) -> None:
    temporary = destination.with_suffix(destination.suffix + ".part")
    messages: dict[int, bytes] = {}
    try:
        with ThreadPoolExecutor(max_workers=args.download_workers) as executor:
            futures = [
                executor.submit(
                    fetch_range, url, record, args.timeout, args.retries,
                )
                for record in records
            ]
            for future in as_completed(futures):
                number, payload = future.result()
                messages[number] = payload
        with temporary.open("wb") as output:
            for number in sorted(messages):
                output.write(messages[number])
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def download_from_aws(
    args: argparse.Namespace,
    forecast_hour: int,
    pressure_path: Path,
    surface_path: Path,
) -> dict[str, str]:
    object_url = aws_object_url(args, forecast_hour)
    index_url = object_url + ".idx"
    response = requests.get(index_url, timeout=(30, args.timeout))
    response.raise_for_status()
    pressure_records, surface_records = select_ivt_records(parse_gfs_index(response.text))
    print(f"  AWS: downloading {len(pressure_records) + 1} indexed GRIB records")
    download_aws_records(object_url, pressure_records, pressure_path, args)
    download_aws_records(object_url, surface_records, surface_path, args)
    return {"source": "aws", "url": object_url, "indexUrl": index_url}


def ncei_candidate_urls(args: argparse.Namespace, forecast_hour: int) -> list[str]:
    month = args.date[:6]
    time_token = f"{args.cycle}00"
    hour = f"{forecast_hour:03d}"
    candidates: list[str] = []
    for collection, prefix in (
        ("model-gfs-004-files", "gfs_3"),
        ("model-gfs-004-files", "gfs_4"),
        ("model-gfs-004-files-old", "gfs_4"),
    ):
        filename = f"{prefix}_{args.date}_{time_token}_{hour}.grb2"
        candidates.append(f"{NCEI_ROOT}/{collection}/{month}/{args.date}/{filename}")
    return candidates


def download_from_ncei(
    args: argparse.Namespace,
    forecast_hour: int,
    pressure_path: Path,
) -> dict[str, str]:
    errors = []
    for url in ncei_candidate_urls(args, forecast_hour):
        try:
            print(f"  NCEI: trying {url}")
            download(url, pressure_path, args.timeout, max(1, min(args.retries, 2)))
            print(
                "  warning: NCEI historical grids may differ from 0.25-degree GFS; "
                "the actual grid will be recorded in the manifest",
                file=sys.stderr,
            )
            return {"source": "ncei", "url": url}
        except RuntimeError as exc:
            errors.append(str(exc))
    raise RuntimeError("NCEI candidates unavailable: " + "; ".join(errors))


def download_inputs(
    args: argparse.Namespace,
    forecast_hour: int,
    pressure_path: Path,
    surface_path: Path,
) -> tuple[dict[str, str], Path]:
    if args.source == "auto":
        init_time = datetime.strptime(args.date + args.cycle, "%Y%m%d%H").replace(
            tzinfo=timezone.utc,
        )
        # NOMADS is a short rolling archive. Avoid several predictable retries
        # for historical runs, while retaining its efficient spatial subsetting
        # for recent data.
        recent_cutoff = datetime.now(timezone.utc) - timedelta(days=10)
        sources = (
            ("nomads", "aws", "ncei")
            if init_time >= recent_cutoff
            else ("aws", "ncei")
        )
    else:
        sources = (args.source,)
    errors = []
    for source in sources:
        pressure_path.unlink(missing_ok=True)
        surface_path.unlink(missing_ok=True)
        try:
            if source == "nomads":
                pressure_url = build_download_url(args, forecast_hour)
                surface_url = build_download_url(args, forecast_hour, surface_only=True)
                download(pressure_url, pressure_path, args.timeout, args.retries)
                download(surface_url, surface_path, args.timeout, args.retries)
                return {
                    "source": "nomads",
                    "url": pressure_url,
                    "surfaceUrl": surface_url,
                }, surface_path
            if source == "aws":
                return (
                    download_from_aws(
                        args, forecast_hour, pressure_path, surface_path,
                    ),
                    surface_path,
                )
            provenance = download_from_ncei(args, forecast_hour, pressure_path)
            return provenance, pressure_path
        except (requests.RequestException, RuntimeError) as exc:
            errors.append(f"{source}: {exc}")
            print(f"  {source} unavailable: {exc}", file=sys.stderr)
    raise RuntimeError("all requested data sources failed: " + " | ".join(errors))


def describe_dataset(dataset: xr.Dataset) -> str:
    variables = []
    for name, variable in dataset.data_vars.items():
        short_name = variable.attrs.get("GRIB_shortName", "?")
        parameter_name = variable.attrs.get("GRIB_name", variable.attrs.get("long_name", "?"))
        variables.append(f"{name} (shortName={short_name}, name={parameter_name})")
    return ", ".join(variables) or "no data variables"


def find_surface_pressure(dataset: xr.Dataset) -> xr.DataArray | None:
    """Find surface pressure across cfgrib/ecCodes naming variations."""
    aliases = {"sp", "pres", "pressure"}
    for name, variable in dataset.data_vars.items():
        short_name = str(variable.attrs.get("GRIB_shortName", "")).lower()
        parameter_name = str(
            variable.attrs.get("GRIB_name", variable.attrs.get("long_name", "")),
        ).lower()
        units = str(variable.attrs.get("units", "")).lower()
        if (
            name.lower() in aliases
            or short_name in aliases
            or "surface pressure" in parameter_name
            or (parameter_name == "pressure" and units in {"pa", "pascal", "pascals"})
        ):
            return variable
    # The NOMADS subset requests only PRES at typeOfLevel=surface. Some ecCodes
    # tables give it an unexpected variable name, so a lone 2-D field is safe.
    candidates = [variable for variable in dataset.data_vars.values() if variable.ndim >= 2]
    return candidates[0] if len(candidates) == 1 else None


def open_grib(path: Path, surface_path: Path) -> tuple[xr.Dataset, xr.DataArray]:
    common = {"indexpath": "", "filter_by_keys": {"typeOfLevel": "isobaricInhPa"}}
    pressure = xr.open_dataset(path, engine="cfgrib", backend_kwargs=common)
    required = {"q", "u", "v"}
    missing = required.difference(pressure.data_vars)
    if missing:
        pressure.close()
        raise RuntimeError(f"GRIB is missing pressure-level fields: {sorted(missing)}")

    # Do not filter by shortName here: GFS calls the GRIB parameter PRES, while
    # cfgrib/ecCodes versions variously expose it as sp or pres.
    surface_ds = xr.open_dataset(
        surface_path,
        engine="cfgrib",
        backend_kwargs={"indexpath": "", "filter_by_keys": {"typeOfLevel": "surface"}},
    )
    surface_variable = find_surface_pressure(surface_ds)
    if surface_variable is None:
        available = describe_dataset(surface_ds)
        pressure.close()
        surface_ds.close()
        raise RuntimeError(
            "GRIB surface dataset does not contain a recognizable pressure field; "
            f"available: {available}",
        )
    surface_pressure = surface_variable.load()
    units = str(surface_pressure.attrs.get("units", "Pa")).lower()
    if units in {"hpa", "mb", "millibar", "millibars"}:
        surface_pressure = surface_pressure * 100.0
        surface_pressure.attrs["units"] = "Pa"
    elif units not in {"pa", "pascal", "pascals"}:
        median_pressure = float(np.nanmedian(surface_pressure.values))
        if 500.0 <= median_pressure <= 1100.0:
            print(
                f"  warning: assuming surface pressure units '{units}' are hPa",
                file=sys.stderr,
            )
            surface_pressure = surface_pressure * 100.0
            surface_pressure.attrs["units"] = "Pa"
        elif not 50_000.0 <= median_pressure <= 110_000.0:
            pressure.close()
            surface_ds.close()
            raise RuntimeError(
                f"surface pressure has unrecognized units '{units}' and median {median_pressure:g}",
            )
    surface_ds.close()
    return pressure.load(), surface_pressure


def integrate_ivt(
    pressure_hpa: np.ndarray,
    specific_humidity: np.ndarray,
    u_wind: np.ndarray,
    v_wind: np.ndarray,
    surface_pressure_pa: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Integrate q*u and q*v from 300 hPa to local surface pressure."""
    order = np.argsort(pressure_hpa)
    pressure_pa = np.asarray(pressure_hpa, dtype=np.float64)[order] * 100.0
    qu = np.asarray(specific_humidity, dtype=np.float64)[order] * np.asarray(u_wind, dtype=np.float64)[order]
    qv = np.asarray(specific_humidity, dtype=np.float64)[order] * np.asarray(v_wind, dtype=np.float64)[order]
    ps = np.asarray(surface_pressure_pa, dtype=np.float64)

    def integrate_component(field: np.ndarray) -> np.ndarray:
        result = np.zeros(ps.shape, dtype=np.float64)
        has_data = np.zeros(ps.shape, dtype=bool)
        for index in range(1, pressure_pa.size):
            lower, upper = pressure_pa[index - 1], pressure_pa[index]
            lower_field, upper_field = field[index - 1], field[index]
            finite_lower = np.isfinite(lower_field)
            finite_pair = finite_lower & np.isfinite(upper_field)

            full = (ps >= upper) & finite_pair
            result[full] += 0.5 * (lower_field[full] + upper_field[full]) * (upper - lower)
            has_data[full] = True

            partial = (ps > lower) & (ps < upper) & finite_lower
            fraction = np.clip((ps - lower) / (upper - lower), 0.0, 1.0)
            interpolated = np.where(
                finite_pair,
                lower_field + fraction * (upper_field - lower_field),
                lower_field,
            )
            result[partial] += 0.5 * (lower_field[partial] + interpolated[partial]) * (ps[partial] - lower)
            has_data[partial] = True

        bottom = pressure_pa[-1]
        bottom_field = field[-1]
        extension = (ps > bottom) & np.isfinite(bottom_field)
        result[extension] += bottom_field[extension] * (ps[extension] - bottom)
        has_data[extension] = True
        result[~has_data | (ps <= pressure_pa[0]) | ~np.isfinite(ps)] = np.nan
        return (result / GRAVITY).astype(np.float32)

    return integrate_component(qu), integrate_component(qv)


def orient_grid(
    latitude: np.ndarray,
    longitude: np.ndarray,
    west: float,
    crosses_antimeridian: bool,
    *fields: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, list[np.ndarray]]:
    latitude = np.asarray(latitude)
    longitude = np.asarray(longitude)
    oriented = [np.asarray(field) for field in fields]
    if latitude[0] < latitude[-1]:
        latitude = latitude[::-1]
        oriented = [field[::-1, :] for field in oriented]
    if crosses_antimeridian:
        # Keep a Pacific domain continuous in an unwrapped coordinate range.
        # For --west 100 --east -100, output columns remain 100...260 rather
        # than being split into 100...180 and -180...-100.
        west_360 = west % 360.0
        longitude = longitude % 360.0
        longitude = np.where(longitude < west_360 - 1e-8, longitude + 360.0, longitude)
    else:
        # Use conventional signed longitudes for non-crossing/global output.
        longitude = np.where(longitude >= 180.0, longitude - 360.0, longitude)
    lon_order = np.argsort(longitude)
    longitude = longitude[lon_order]
    oriented = [field[:, lon_order] for field in oriented]
    # Some full-globe subset responses include both 0 and 360 degrees. They
    # describe the same meridian, so retain only the first occurrence.
    rounded_longitude = np.round(longitude, decimals=8)
    _, unique_indices = np.unique(rounded_longitude, return_index=True)
    unique_indices.sort()
    longitude = longitude[unique_indices]
    oriented = [field[:, unique_indices] for field in oriented]
    return latitude, longitude, oriented


def crop_grid(
    latitude: np.ndarray,
    longitude: np.ndarray,
    args: argparse.Namespace,
    *fields: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, list[np.ndarray]]:
    """Crop full archived grids after normalizing their longitude convention."""
    latitude_mask = (latitude >= args.south - 1e-8) & (latitude <= args.north + 1e-8)
    if is_global_domain(args):
        longitude_mask = np.ones(longitude.shape, dtype=bool)
    else:
        east = args.east + 360.0 if crosses_dateline(args) else args.east
        longitude_mask = (longitude >= args.west - 1e-8) & (longitude <= east + 1e-8)
    if not latitude_mask.any() or not longitude_mask.any():
        raise RuntimeError("requested domain does not intersect the downloaded GFS grid")
    cropped = [field[np.ix_(latitude_mask, longitude_mask)] for field in fields]
    return latitude[latitude_mask], longitude[longitude_mask], cropped


def encode_component(component: np.ndarray, limit: float) -> np.ndarray:
    normalized = np.clip((component + limit) / (2.0 * limit), 0.0, 1.0)
    return np.rint(normalized * 65535.0).astype(np.uint16)


def write_texture(path: Path, ivt_u: np.ndarray, ivt_v: np.ndarray, limit: float) -> None:
    packed_u = encode_component(np.nan_to_num(ivt_u), limit)
    packed_v = encode_component(np.nan_to_num(ivt_v), limit)
    rgba = np.empty((*ivt_u.shape, 4), dtype=np.uint8)
    rgba[..., 0] = packed_u >> 8
    rgba[..., 1] = packed_u & 255
    rgba[..., 2] = packed_v >> 8
    rgba[..., 3] = packed_v & 255
    Image.fromarray(rgba, mode="RGBA").save(path, optimize=True)


def finite_range(values: np.ndarray) -> list[float | None]:
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return [None, None]
    return [float(finite.min()), float(finite.max())]


def process_hour(
    args: argparse.Namespace,
    init_time: datetime,
    forecast_hour: int,
    raw_dir: Path,
    texture_dir: Path,
) -> dict[str, object]:
    stem = f"gfs_{args.date}_{args.cycle}_f{forecast_hour:03d}"
    grib_path = raw_dir / f"{stem}.grib2"
    surface_grib_path = raw_dir / f"{stem}_surface.grib2"
    texture_path = texture_dir / f"{stem}_ivt.png"
    mask_path = texture_dir / f"{stem}_mask.png"
    provenance_path = raw_dir / f"{stem}_source.json"
    cached_provenance = (
        json.loads(provenance_path.read_text(encoding="utf-8"))
        if provenance_path.exists()
        else None
    )
    source_mismatch = (
        args.source != "auto"
        and cached_provenance is not None
        and cached_provenance.get("source") != args.source
    )
    if (
        not grib_path.exists()
        or (not surface_grib_path.exists() and not provenance_path.exists())
        or source_mismatch
        or args.overwrite
    ):
        print(f"Downloading f{forecast_hour:03d} (source={args.source})")
        provenance, actual_surface_path = download_inputs(
            args, forecast_hour, grib_path, surface_grib_path,
        )
        provenance_path.write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    else:
        print(f"Using existing {grib_path}")
        provenance = cached_provenance or {
            "source": "existing-local",
            "url": str(grib_path),
        }
        actual_surface_path = (
            surface_grib_path if surface_grib_path.exists() else grib_path
        )

    pressure, surface_pressure = open_grib(grib_path, actual_surface_path)
    try:
        ivt_u, ivt_v = integrate_ivt(
            pressure.isobaricInhPa.values,
            pressure.q.values,
            pressure.u.values,
            pressure.v.values,
            surface_pressure.values,
        )
        latitude, longitude, (ivt_u, ivt_v) = orient_grid(
            pressure.latitude.values,
            pressure.longitude.values,
            args.west,
            crosses_dateline(args),
            ivt_u,
            ivt_v,
        )
        latitude, longitude, (ivt_u, ivt_v) = crop_grid(
            latitude, longitude, args, ivt_u, ivt_v,
        )
    finally:
        pressure.close()

    valid = np.isfinite(ivt_u) & np.isfinite(ivt_v)
    write_texture(texture_path, ivt_u, ivt_v, args.component_limit)
    Image.fromarray(np.where(valid, 255, 0).astype(np.uint8), mode="L").save(mask_path, optimize=True)
    magnitude = np.hypot(ivt_u, ivt_v)
    clipped = valid & ((np.abs(ivt_u) > args.component_limit) | (np.abs(ivt_v) > args.component_limit))
    if args.delete_grib:
        grib_path.unlink(missing_ok=True)
        if actual_surface_path != grib_path:
            actual_surface_path.unlink(missing_ok=True)

    return {
        "forecastHour": forecast_hour,
        "validTime": (init_time + timedelta(hours=forecast_hour)).isoformat().replace("+00:00", "Z"),
        "texture": f"textures/{texture_path.name}",
        "mask": f"textures/{mask_path.name}",
        "ranges": {
            "ivtU": finite_range(ivt_u),
            "ivtV": finite_range(ivt_v),
            "magnitude": finite_range(magnitude),
        },
        "clippedFraction": float(clipped.sum() / max(1, valid.sum())),
        "validFraction": float(valid.mean()),
        "dataSource": provenance,
        "grid": {
            "width": int(longitude.size),
            "height": int(latitude.size),
            "west": float(longitude[0]),
            "east": float(longitude[-1]),
            "south": float(latitude[-1]),
            "north": float(latitude[0]),
            "dx": float(np.median(np.diff(longitude))),
            "dy": float(abs(np.median(np.diff(latitude)))),
        },
    }


def main() -> int:
    args = parse_args()
    try:
        init_time = validate_args(args)
        hours = parse_hours(args.hours)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    raw_dir = args.output / "raw"
    texture_dir = args.output / "textures"
    raw_dir.mkdir(parents=True, exist_ok=True)
    texture_dir.mkdir(parents=True, exist_ok=True)

    timesteps = []
    for forecast_hour in hours:
        try:
            timesteps.append(process_hour(args, init_time, forecast_hour, raw_dir, texture_dir))
        except Exception as exc:  # continue so a transient missing forecast hour does not discard prior work
            print(f"error processing f{forecast_hour:03d}: {exc}", file=sys.stderr)
            return 1

    first_grid = timesteps[0]["grid"]
    if any(item["grid"] != first_grid for item in timesteps[1:]):
        raise RuntimeError("forecast hours produced inconsistent grids")
    source_names = sorted({str(item["dataSource"]["source"]) for item in timesteps})
    resolution = float(first_grid["dx"])
    manifest = {
        "schemaVersion": 1,
        "model": f"NOAA GFS {resolution:g} degree",
        "initializationTime": init_time.isoformat().replace("+00:00", "Z"),
        "dataSources": source_names,
        "units": "kg m-1 s-1",
        "integration": {
            "topPressureHpa": min(PRESSURE_LEVELS_HPA),
            "bottom": "surface pressure, capped/extrapolated from 1000 hPa",
            "method": "trapezoidal in pressure coordinates",
            "gravityMps2": GRAVITY,
        },
        "grid": first_grid,
        "rowOrder": "north-to-south",
        "encoding": {
            "format": "png-rgba8-ivt-components",
            "componentLimit": args.component_limit,
            "u16": "R * 256 + G",
            "v16": "B * 256 + A",
            "decodeU": f"(u16 / 65535) * {2 * args.component_limit:g} - {args.component_limit:g}",
            "decodeV": f"(v16 / 65535) * {2 * args.component_limit:g} - {args.component_limit:g}",
            "imageLoading": {"premultiplyAlpha": "none", "colorSpaceConversion": "none"},
            "mask": "separate 8-bit PNG; 255 valid, 0 invalid",
        },
        "timesteps": timesteps,
    }
    manifest_path = args.output / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(timesteps)} timesteps and {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
