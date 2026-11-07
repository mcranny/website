#!/usr/bin/env python3
"""Record reviewed ASIC assets, preserving both versions in the public allowlist.

Explicit publishing step only: ordinary checks/builds never rewrite checksums.
"""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]


def main():
    public_path = ROOT/'scripts/public-files.json'
    public = set(json.loads(public_path.read_text()))
    for version in ('v2', 'v3'):
        base = ROOT/f'assets/protocol-emulator/{version}'
        summary = json.loads((base/'summary.json').read_text())
        files = sorted(p for p in base.rglob('*') if p.is_file() and p.name != 'checksums.json')
        manifest = {'schema': 1, 'physical_source_commit': summary['physical_source_commit'],
                    'files': {str(p.relative_to(base)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
        (base/'checksums.json').write_text(json.dumps(manifest, indent=2)+'\n')
        public = {name for name in public if not name.startswith(f'assets/protocol-emulator/{version}/')}
        public.update(str(p.relative_to(ROOT)) for p in base.rglob('*') if p.is_file())
        print(f'{version}: {len(files)} verified assets')
    public.update(('js/gds-viewer.js', 'js/asic-versions.js'))
    public_path.write_text(json.dumps(sorted(public), indent=2)+'\n')
    print(f'{len(public)} public files')


if __name__ == '__main__':
    main()
