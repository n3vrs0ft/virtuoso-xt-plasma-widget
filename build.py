#!/usr/bin/env python3
"""Reproducible, allowlisted local .plasmoid builder. Does not install software."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json

ROOT = Path(__file__).resolve().parent
meta = json.loads((ROOT / 'metadata.json').read_text(encoding='utf-8'))
assert meta['KPlugin']['Id'] == 'io.github.n3vrs0ft.virtuosoxt'
assert meta['KPlugin']['Version'] == '1.4.0'
FILES = [
    'metadata.json', 'LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
    'contents/code/Hub.js', 'contents/ui/main.qml', 'contents/ui/HubStatus.qml',
    'contents/ui/BatteryIndicator.qml', 'tests/test.js'
]
DEST = ROOT / 'dist' / 'virtuoso-xt-plasma-widget-1.4.0.plasmoid'
DEST.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(DEST, 'w', ZIP_DEFLATED, compresslevel=9) as z:
    for rel in sorted(FILES):
        path = ROOT / rel
        if not path.is_file() or path.is_symlink():
            raise FileNotFoundError('Missing or unsafe required input: ' + rel)
        info = ZipInfo(rel, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = (0o100644 << 16)
        z.writestr(info, path.read_bytes())
print('Created:', DEST)
