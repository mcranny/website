#!/usr/bin/env python3
"""Record reviewed V2 files and update the public allowlist after asset changes.

This intentionally refreshes hashes: inspect source provenance before running.
Normal builds verify these records and never rewrite them.
"""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
base = ROOT/'assets/protocol-emulator/v2'
files = sorted(p for p in base.rglob('*') if p.is_file() and p.name != 'checksums.json')
manifest = {'schema':1,'physical_source_commit':'447b3dfd0986d473c71afa28efafb3a5cff48da7',
            'files':{str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
(base/'checksums.json').write_text(json.dumps(manifest,indent=2)+'\n')
p = ROOT/'scripts/public-files.json'
public = [name for name in json.loads(p.read_text()) if not name.startswith('assets/protocol-emulator/')
          and not name.startswith('assets/vendor/osd-images/') and not name.startswith('js/vendor/openseadragon')]
public += [str(f.relative_to(ROOT)) for f in base.rglob('*') if f.is_file()]
public.append('js/gds-viewer.js')
p.write_text(json.dumps(sorted(set(public)),indent=2)+'\n')
print(f'Recorded {len(files)} V2 assets and {len(set(public))} public files.')
