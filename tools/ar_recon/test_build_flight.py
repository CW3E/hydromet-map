import json
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path
from unittest import mock

import build_flight
import build_catalog


NOAA_HDOBS = """
180
URPN15 KWBC 122103
NOAA9 41WSE IOP42              HDOB 10 20260312
205330 4250N 13336W 1793 12771 0300 -711 //// ////// /// /// /// 09
205400 4250N 13340W 1793 12772 0300 -711 //// 270045 000 /// /// 09
"""

AIR_FORCE_HDOBS = """
046
URPN15 KNHC 031814
AF303 16WSC IOP40              HDOB 01 20260303
180530 2119N 15805W 0170 ///// 0153 +305 +190 000000 000 /// /// 23
181100 2119N 15805W 0170 00024 0197 +325 +188 000000 000 /// /// 03
"""


class FakeVariable:
    def __init__(self, values, units=None):
        self.values = values
        self.units = units

    def __getitem__(self, _key):
        return self.values


class FakeDataset:
    def __init__(self, _path, _mode):
        self.SondeId = "test-sonde"
        self.Flight = "20260312N1"
        self.PlatformType = "NOAA9"
        self.variables = {
            "time": FakeVariable([3, 2, 1, 0], "seconds since 2026-03-12 21:05:03 UTC"),
            "lat": FakeVariable([42.0, 42.1, -999, 42.3]),
            "lon": FakeVariable([-135.0, -135.1, -999, -135.3]),
            "alt": FakeVariable([100, 200, -999, 400]),
            "pres": FakeVariable([1000, -999, -999, 900]),
            "reference_lon": FakeVariable([-135.3]),
            "reference_lat": FakeVariable([42.3]),
            "reference_alt": FakeVariable([400]),
        }

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class FakeNetcdf4:
    Dataset = FakeDataset


class BuildFlightTest(unittest.TestCase):
    def test_builds_catalog_from_year_iop_aircraft_hierarchy(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            manifest_dir = root / "2026" / "IOP42" / "NOAA-GIV"
            manifest_dir.mkdir(parents=True)
            (manifest_dir / "manifest.json").write_text(
                json.dumps({
                    "flightId": "2026-IOP42-NOAA-GIV",
                    "inputDirectory": "NOAA-GIV",
                    "originTime": "2026-03-12T19:23:30Z",
                    "endTime": "2026-03-13T02:33:00Z",
                    "platforms": ["NOAA9"],
                    "sondes": {"count": 30},
                }),
                encoding="utf-8",
            )

            catalog = build_catalog.build_catalog(root)

            self.assertEqual(catalog["flightCount"], 1)
            self.assertEqual(catalog["flights"][0]["year"], "2026")
            self.assertEqual(catalog["flights"][0]["iop"], "IOP42")
            self.assertEqual(catalog["flights"][0]["aircraft"], "NOAA-GIV")
            self.assertEqual(
                catalog["flights"][0]["manifestUrl"],
                "2026/IOP42/NOAA-GIV/manifest.json",
            )

    def test_parses_noaa_hdobs_position_altitude_and_measurements(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            hdobs_dir = Path(temporary_directory) / "HDOBS"
            hdobs_dir.mkdir()
            path = hdobs_dir / "AHOPN1-KWBC.202603122103.txt"
            path.write_text(NOAA_HDOBS, encoding="utf-8")
            report = build_flight.ProcessingReport()

            points, metadata = build_flight.parse_hdobs_file(path, report)

            self.assertEqual(len(points), 2)
            self.assertAlmostEqual(points[0].latitude, 42 + 50 / 60)
            self.assertAlmostEqual(points[0].longitude, -(133 + 36 / 60))
            self.assertEqual(points[0].altitude_msl_meters, 12771)
            self.assertEqual(points[0].measurements["pressureHpa"], 179.3)
            self.assertEqual(points[0].measurements["temperatureC"], -71.1)
            self.assertEqual(points[1].measurements["windDirectionDegrees"], 270)
            self.assertEqual(points[1].measurements["windSpeedKnots"], 45)
            self.assertEqual(metadata["platform"], "NOAA9")
            self.assertEqual(metadata["iop"], "IOP42")

    def test_parses_air_force_hdobs_and_skips_missing_altitude(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            hdobs_dir = Path(temporary_directory) / "HDOBS"
            hdobs_dir.mkdir()
            path = hdobs_dir / "AHOPN1-KNHC.202603031814.txt"
            path.write_text(AIR_FORCE_HDOBS, encoding="utf-8")
            report = build_flight.ProcessingReport()

            points, metadata = build_flight.parse_hdobs_file(path, report)

            self.assertEqual(len(points), 1)
            self.assertEqual(report.hdobs_rows_skipped, 1)
            self.assertEqual(points[0].altitude_msl_meters, 24)
            self.assertEqual(points[0].measurements["pressureHpa"], 1017.0)
            self.assertEqual(metadata["platform"], "AF303")

    def test_assigns_pre_midnight_rows_to_previous_date(self):
        anchor = datetime(2026, 3, 13, 0, 3, tzinfo=UTC)
        parsed = build_flight.parse_hdobs_timestamp(anchor.date(), "235330", anchor)
        self.assertEqual(parsed, datetime(2026, 3, 12, 23, 53, 30, tzinfo=UTC))

    def test_loads_shared_qc_netcdf_schema_and_sorts_time(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            input_dir = Path(temporary_directory)
            path = input_dir / "exampleQC.nc"
            path.touch()
            report = build_flight.ProcessingReport()

            sonde = build_flight.load_sonde(path, input_dir, FakeNetcdf4, report)

            self.assertEqual(sonde.sonde_id, "test-sonde")
            self.assertEqual(len(sonde.points), 3)
            self.assertEqual(sonde.points[0].latitude, 42.3)
            self.assertEqual(sonde.points[-1].latitude, 42.0)
            self.assertEqual(report.sonde_rows_skipped, 1)
            self.assertEqual(sonde.reference_position, (-135.3, 42.3, 400.0))

    def test_builds_manifest_aircraft_and_separate_sonde_files(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            input_dir = root / "NOAA-GIV"
            hdobs_dir = input_dir / "HDOBS"
            hdobs_dir.mkdir(parents=True)
            (hdobs_dir / "AHOPN1-KWBC.202603122103.txt").write_text(NOAA_HDOBS, encoding="utf-8")
            (input_dir / "exampleQC.nc").touch()
            output_dir = root / "output"

            with mock.patch.object(build_flight, "import_netcdf4", return_value=FakeNetcdf4):
                manifest, report = build_flight.build_flight(input_dir, output_dir)

            self.assertEqual(manifest["flightId"], "20260312N1")
            self.assertEqual(manifest["aircraft"]["pointCount"], 2)
            self.assertEqual(manifest["sondes"]["count"], 1)
            self.assertEqual(report.sonde_files_loaded, 1)
            sonde_index = json.loads((output_dir / "sondes" / "index.json").read_text())
            self.assertEqual(sonde_index["sondes"][0]["file"], "sondes/test-sonde.json")
            sonde = json.loads((output_dir / "sondes" / "test-sonde.json").read_text())
            self.assertEqual(sonde["pointCount"], 3)
            self.assertIn("aircraftMatch", sonde)


if __name__ == "__main__":
    unittest.main()
