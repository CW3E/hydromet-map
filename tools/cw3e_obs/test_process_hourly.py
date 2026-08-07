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

    def test_uses_latest_dated_schema_and_skips_older_format_files(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            station_dir = root / "raw" / "MYD"
            old_hourly_dir = station_dir / "2025" / "Hourly"
            old_hourly_dir.mkdir(parents=True)

            (station_dir / "MYD_HourlyData_README.txt").write_text(
                "\n".join(
                    [
                        "2025-07-15 - current",
                        "Columns headers are:",
                        "1. Year",
                        "2. Month",
                        "3. Day",
                        "4. Hour",
                        "5. Temperature (C)",
                        "6. Soil Moisture - 5 cm (frac)",
                        "2024-06-03 - 2025-07-15",
                        "Columns headers are:",
                        "1. Year",
                        "2. Month",
                        "3. Day",
                        "4. Hour",
                        "5. Precipitation (inches)",
                        "6. Snow depth (cm)",
                    ]
                ),
                encoding="utf-8",
            )
            (old_hourly_dir / "MYD_20250714.txt").write_text(
                "2025,07,14,23,0.2,12.0\n",
                encoding="utf-8",
            )
            (old_hourly_dir / "MYD_20250715.txt").write_text(
                "2025,07,15,00,18.5,0.274\n"
                "2025,07,15,01,18.0,-99.99\n",
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
            self.assertEqual(report.files_seen, 2)
            self.assertEqual(report.files_loaded, 1)
            self.assertEqual(report.files_skipped_before_schema, 1)
            self.assertEqual(manifest["years"], [2025])

            schema = json.loads((output_dir / "schemas" / "MYD.json").read_text())
            self.assertEqual(schema["valid_from"], "2025-07-15")
            self.assertEqual(schema["source_columns"][5]["multiplier"], 100)

            with (output_dir / "hourly" / "MYD" / "latest_183d.csv").open() as handle:
                rolling_rows = list(csv.DictReader(handle))
            self.assertEqual(len(rolling_rows), 2)
            self.assertEqual(rolling_rows[0]["soil_moisture_5cm_pct"], "27.4")
            self.assertEqual(rolling_rows[1]["soil_moisture_5cm_pct"], "-99.99")

    def test_latest_schema_stops_when_numbering_restarts_without_another_date(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            readme_path = Path(temporary_directory) / "FMI_HourlyData_README.txt"
            readme_path.write_text(
                "\n".join(
                    [
                        "2024-10-01 - current",
                        "Columns headers are:",
                        "1. Year",
                        "2. Month",
                        "3. Day",
                        "4. Hour",
                        "5. Average Wind Speed (m/s)",
                        "Columns headers are:",
                        "1. Year",
                        "2. Month",
                        "3. Day",
                        "4. Hour",
                        "5. Solar Radiation (W/m^2)",
                    ]
                ),
                encoding="utf-8",
            )

            columns, _, valid_from = process_hourly.parse_hourly_schema(readme_path)

            self.assertEqual(valid_from.isoformat(), "2024-10-01")
            self.assertEqual(columns[-1], "wind_speed_ms")


if __name__ == "__main__":
    unittest.main()
