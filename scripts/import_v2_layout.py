#!/usr/bin/env python3
"""Import the selected, pinned V2 static export; never follow a new layout silently.

The upstream exporter independently inventories KLayout/gdstk polygons. This
import verifies that published manifest, every geometry tile, and original GDS.
Run only when rebuilding assets, not during ordinary website builds.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import tarfile
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/protocol-emulator/v2/layout-447b3df'
BASE = 'https://mcranny.github.io/protocol-emulator-asic/layout/'
MANIFEST_HASH = 'aa18c5e6704ef6ce17fd2fe8425774efbd676cddd7c642be5b9274b06331861c'


def fetch(url, path, expected=None):
    if path.exists() and expected and hashlib.sha256(path.read_bytes()).hexdigest() == expected:
        return
    with urlopen(url, timeout=60) as response:
        data = response.read()
    if expected and hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f'Checksum mismatch: {url}')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    fetch(BASE + 'manifest.json', DEST / 'manifest.json', MANIFEST_HASH)
    manifest = json.loads((DEST / 'manifest.json').read_text())
    assert manifest['independent_inventory_matches'] and not manifest['geometry_simplified']
    assert manifest['layers_omitted'] == [] and manifest['hierarchy_depth_limit'] is None
    jobs = [(f'tiles/{key}.jsonl.gz', item['sha256']) for key, item in manifest['tiles'].items()]
    # Previews are display-only. Their imported hashes are retained in checksums.json.
    jobs += [(layer['preview'], None) for layer in manifest['layers']]
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda item: fetch(BASE + item[0], DEST / item[0], item[1]), jobs))
    provenance = manifest['provenance']
    archive = DEST / 'selected-layout.tar.gz'
    fetch(provenance['archive_url'], archive, provenance['archive_sha256'])
    with tarfile.open(archive) as tar:
        member = next(m for m in tar.getmembers() if Path(m.name).name == provenance['gds_member'])
        with tar.extractfile(member) as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        assert digest == manifest['source_sha256'], 'Original GDS differs'
        print(f'Original GDS: {member.size:,} bytes; download retained in original release archive.')
    total = sum(p.stat().st_size for p in DEST.rglob('*') if p.is_file())
    print(f'Imported {len(manifest["tiles"])} verified tiles, {total:,} bytes total.')


if __name__ == '__main__':
    main()
