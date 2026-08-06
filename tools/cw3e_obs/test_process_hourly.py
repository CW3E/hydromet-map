import csv
import gzip
import json
import tempfile
import unittest
from pathlib import Path

import process_hourly


class ProcessHourlyTest(unittest.TestCase):
    def test_finds_hourly_schema_with_or_without_readme_in_filename(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            station_dir = Path(temporary_directory) / "BKR"
            station_dir.mkdir()
            alternate = station_dir / "BKR_HourlyData.txt"
            alternate.write_text("1. Year\n", encoding="utf-8")

            self.assertEqual(
                process_hourly.find_hourly_readme(station_dir, "BKR"),
                alternate,
            )

    def test_processes_station_into_yearly_and_rolling_outputs(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            station_dir = root / "raw" / "SIO"
            hourly_dir = station_dir / "2025" / "Hourly"
            hourly_dir.mkdir(parents=True)

            (station_dir / "SIO_HourlyData_README.txt").write_text(
                "\n".join(
                    [
                        "Columns headers are:",
                        "1. Year",
                        "2. Month",
                        "3. Day",
                        "4. Hour",
                        "5. Pressure (hPa)",
                        "6. Temperature (C)",
                        "7. Relative Humidity (%)",
                        "8. Precipitation (mm)",
                    ]
                ),
                encoding="utf-8",
            )
            (station_dir / "SIO_README.txt").write_text(
                "Lat: 32.86670\nLong: -117.25602\nElev: 7m\n",
                encoding="utf-8",
            )
            (hourly_dir / "SIO_20250101.txt").write_text(
                "2025,01,01,00,1012.5,14.2,60.0,0.0\n"
                "2025,01,01,01,1012.4,14.0,61.0,0.2\n",
                encoding="utf-8",
            )

            output_dir = root / "output"
            manifest, report = process_hourly.process_station(
                station_dir,
                output_dir,
                rolling_days=183,
                timezone_label="source-local-unspecified",
            )

            self.assertEqual(report.status, "ok")
            self.assertEqual(report.rows_loaded, 2)
            self.assertEqual(manifest["years"], [2025])
            self.assertEqual(manifest["latitude"], 32.86670)
            self.assertIn("precipitation_mm", manifest["variables"])

            with gzip.open(output_dir / "hourly" / "SIO" / "2025.csv.gz", "rt") as handle:
                yearly_rows = list(csv.DictReader(handle))
            self.assertEqual(len(yearly_rows), 2)
            self.assertEqual(yearly_rows[1]["precipitation_mm"], "0.2")
            self.assertEqual(yearly_rows[1]["timestamp"], "2025-01-01T01:00:00")

            with (output_dir / "hourly" / "SIO" / "latest_183d.csv").open() as handle:
                rolling_rows = list(csv.DictReader(handle))
            self.assertEqual(len(rolling_rows), 2)

            schema = json.loads((output_dir / "schemas" / "SIO.json").read_text())
            self.assertEqual(schema["source_columns"][7]["column"], "precipitation_mm")


if __name__ == "__main__":
    unittest.main()
