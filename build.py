#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Build only explicitly listed widget files; never archive local user data."""
from pathlib import Path
import hashlib
import json
import re
import stat
import sys
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = (
    "LICENSE",
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "metadata.json",
    "contents/code/Hub.js",
    "contents/ui/HubStatus.qml",
    "contents/ui/main.qml",
    "contents/ui/BatteryIndicator.qml",
    "tests/test.js",
)


def main() -> int:
    try:
        # Check all inputs before touching an existing build output.
        contents = {}
        for name in FILES:
            source = ROOT / name
            if not source.is_file() or source.is_symlink():
                raise ValueError(f"Expected a regular, non-symlink source file: {name}")
            source.resolve().relative_to(ROOT)
            contents[name] = source.read_bytes()
        meta = json.loads(contents["metadata.json"])
        version = meta["KPlugin"]["Version"]
        if not isinstance(version, str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
            raise ValueError("Expected a numeric major.minor.patch version")
        output_dir = ROOT / "dist"
        output_dir.mkdir(exist_ok=True)
        destination = output_dir / f"virtuoso-xt-plasma-widget-{version}.plasmoid"
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name in sorted(FILES):
                info = zipfile.ZipInfo(name, date_time=(2026, 9, 19, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, contents[name])
        with zipfile.ZipFile(temporary) as archive:
            bad = archive.testzip()
            if bad is not None:
                raise ValueError(f"Archive integrity check failed: {bad}")
        temporary.replace(destination)
        digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        print(f"Created {destination}")
        print(f"SHA256 {digest}")
        return 0
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as exc:
        print(f"Build failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
