#!/usr/bin/env python3
"""Download GFS pressure-level fields, derive IVT, and pack it for WebGL."""

from __future__ import annotations

import argparse
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
    if not grib_path.exists() or args.overwrite:
        print(f"Downloading f{forecast_hour:03d}")
        download(build_download_url(args, forecast_hour), grib_path, args.timeout, args.retries)
    else:
        print(f"Using existing {grib_path}")
    if not surface_grib_path.exists() or args.overwrite:
        print(f"Downloading f{forecast_hour:03d} surface pressure")
        download(
            build_download_url(args, forecast_hour, surface_only=True),
            surface_grib_path,
            args.timeout,
            args.retries,
        )
    else:
        print(f"Using existing {surface_grib_path}")

    pressure, surface_pressure = open_grib(grib_path, surface_grib_path)
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
    finally:
        pressure.close()

    valid = np.isfinite(ivt_u) & np.isfinite(ivt_v)
    write_texture(texture_path, ivt_u, ivt_v, args.component_limit)
    Image.fromarray(np.where(valid, 255, 0).astype(np.uint8), mode="L").save(mask_path, optimize=True)
    magnitude = np.hypot(ivt_u, ivt_v)
    clipped = valid & ((np.abs(ivt_u) > args.component_limit) | (np.abs(ivt_v) > args.component_limit))
    if args.delete_grib:
        grib_path.unlink(missing_ok=True)
        surface_grib_path.unlink(missing_ok=True)

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
    manifest = {
        "schemaVersion": 1,
        "model": "NOAA GFS 0.25 degree",
        "initializationTime": init_time.isoformat().replace("+00:00", "Z"),
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
