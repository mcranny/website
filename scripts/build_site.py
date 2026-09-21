#!/usr/bin/env python3
"""Publish only the reviewed allowlist, after pre-deploy validation."""
import json
import shutil
from pathlib import Path
from check_site import check, ROOT

check(pdf_text=False)
output = ROOT / 'dist'
if output.is_symlink():
    raise ValueError('Refusing a symlink deploy directory')
if output.exists():
    shutil.rmtree(output)
for name in json.loads((ROOT/'scripts/public-files.json').read_text()):
    target = output/name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/name, target)
print(f'Built {output}')
