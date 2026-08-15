import json
import tempfile
import unittest
from pathlib import Path

try:
    from .build_catalog import build_catalog, write_catalog
except ImportError:  # Allow direct execution from tools/gfs_ivt.
    from build_catalog import build_catalog, write_catalog


class BuildCatalogTests(unittest.TestCase):
    def create_run(self, root: Path, date: str, cycle: str, hours=(0, 3, 6)) -> None:
        run_dir = root / date / cycle
        texture_dir = run_dir / "textures"
        texture_dir.mkdir(parents=True)
        timesteps = []
        for hour in hours:
            texture = texture_dir / f"f{hour:03d}.png"
            mask = texture_dir / f"f{hour:03d}_mask.png"
            texture.write_bytes(b"texture")
            mask.write_bytes(b"mask")
            timesteps.append({
                "forecastHour": hour,
                "texture": f"textures/{texture.name}",
                "mask": f"textures/{mask.name}",
            })
        initialization = (
            f"{date[:4]}-{date[4:6]}-{date[6:]}T{cycle}:00:00Z"
        )
        (run_dir / "manifest.json").write_text(
            json.dumps({"initializationTime": initialization, "timesteps": timesteps}),
            encoding="utf-8",
        )

    def test_builds_newest_first_catalog_and_writes_it(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as temporary_directory:
            root = Path(temporary_directory)
            self.create_run(root, "20220110", "00")
            self.create_run(root, "20260312", "00", hours=(0, 12, 24))

            catalog = build_catalog(root, "test-dataset")
            self.assertEqual(catalog["runCount"], 2)
            self.assertEqual(catalog["defaultInitializationDate"], "2026-03-12")
            self.assertEqual(catalog["runs"][0]["manifest"], "20260312/00/manifest.json")
            self.assertEqual(catalog["runs"][0]["forecastHours"], [0, 12, 24])

            output = root / "catalog.json"
            write_catalog(catalog, output)
            saved = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(saved["dataset"], "test-dataset")

    def test_rejects_missing_assets_by_default(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as temporary_directory:
            root = Path(temporary_directory)
            self.create_run(root, "20260312", "00")
            (root / "20260312/00/textures/f003.png").unlink()

            with self.assertRaisesRegex(ValueError, "missing assets"):
                build_catalog(root, "test-dataset")


if __name__ == "__main__":
    unittest.main()
