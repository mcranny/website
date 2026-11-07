#!/usr/bin/env python3
"""Import the pinned V3 qualification artifacts using the project's GDS exporter.

Requires gh authentication and an upstream checkout containing tools.export_gds_static.
Only the website output and the download cache are written.
"""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/protocol-emulator/v3'
DEST = BASE / 'layout-8b95d90'
SOURCE = '8b95d90b2fbbe5d742700884a49f2b89f1150904'
GDS_HASH = '050b88ed2253acb761f4f6365681a78da5e97520a03d02ff53b5a13e25d2be9f'
ARTIFACTS = {
    'build': (12872272288, 'dd2257117a9cbf81a3c7fd42e80ea3e97b97f11474d4f3057d50188e60e0c857'),
    'acceptance': (12873954682, 'c865d63660199e2ecd8572f49695a8cbd774afede0174721bdbdf0b509826136'),
    'gatelevel': (12874411749, 'fb29f0d995abeca5239ea63c9143d2f09037e69a00d2045b43b5b565dd8caec6'),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--exporter-root', type=Path, required=True)
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    if DEST.exists():
        parser.error(f'Output already exists: {DEST}')
    args.cache.mkdir(parents=True, exist_ok=True)
    archives = {}
    for name, (artifact, expected) in ARTIFACTS.items():
        path = args.cache / f'{artifact}.zip'
        if not path.exists():
            data = subprocess.check_output(['gh', 'api', f'repos/mcranny/protocol-emulator-asic/actions/artifacts/{artifact}/zip'])
            if digest(data) != expected:
                raise ValueError(f'{name} artifact checksum mismatch')
            path.write_bytes(data)
        data = path.read_bytes()
        if digest(data) != expected:
            raise ValueError(f'{name} artifact checksum mismatch')
        archives[name] = zipfile.ZipFile(io.BytesIO(data))
    acceptance = json.loads(archives['acceptance'].read('acceptance.json'))
    assert acceptance['accepted'] and acceptance['source_commit'] == SOURCE
    assert acceptance['sha256']['gds'] == GDS_HASH
    prefix = 'physical/v3/runs/local/final/'
    gds = archives['build'].read(prefix + 'gds/tt_um_mcranny_protocol_emulator_v3.gds')
    assert digest(gds) == GDS_HASH
    metrics_raw = archives['build'].read(prefix + 'metrics.json')
    assert digest(metrics_raw) == acceptance['sha256']['metrics']
    metrics = json.loads(metrics_raw)
    source_gds = args.cache / 'v3.gds'
    source_gds.write_bytes(gds)
    sys.path.insert(0, str(args.exporter_root.resolve()))
    from tools.export_gds_static import export
    report = export(source_gds, DEST, GDS_HASH, columns=16, rows=8)
    for name in ('layout.gds', 'index.html', 'viewer.js', 'viewer.css'):
        (DEST / name).unlink()
    compressed = gzip.compress(gds, mtime=0)
    (DEST / 'layout.gds.gz').write_bytes(compressed)
    provenance = {
        'physical_source_commit': SOURCE,
        'workflow_source_commit': '61065cf777e1d2eb9f641a00c6e28ff034f0014a',
        'workflow_run': 'https://github.com/mcranny/protocol-emulator-asic/actions/runs/40803741147',
        'artifacts': {name: {'id': item[0], 'sha256': item[1]} for name, item in ARTIFACTS.items()},
        'archive_file': 'layout.gds.gz', 'archive_sha256': digest(compressed),
        'gds_sha256': GDS_HASH,
        'exporter_commit': subprocess.check_output(['git', '-C', str(args.exporter_root), 'rev-parse', 'HEAD'], text=True).strip(),
    }
    report['provenance'] = provenance
    (DEST / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    (BASE / 'acceptance.json').write_text(json.dumps(acceptance, indent=2) + '\n')
    (BASE / 'metrics.json').write_bytes(metrics_raw)
    (BASE / 'local-evidence.json').write_bytes(archives['build'].read('local-evidence.json'))
    gate = archives['gatelevel']
    gate_xml = next(n for n in gate.namelist() if n.endswith('.xml'))
    (BASE / 'gatelevel.xml').write_bytes(gate.read(gate_xml))
    summary = dict(provenance, clock_mhz=48, tiles=[8, 4], die_um=[1724.16, 710.64],
                   standard_cell_area_um2=metrics['design__instance__area__stdcell'],
                   sram_area_um2=metrics['design__instance__area__macros'],
                   core_utilization=metrics['design__instance__utilization'],
                   setup_r2r_slow_ns=acceptance['margins']['timing__setup_r2r__ws__corner:nom_slow_1p08V_125C'],
                   hold_fast_ns=acceptance['margins']['timing__hold__ws__corner:nom_fast_1p32V_m40C'],
                   prechecks_passed=sum(v == 'pass' for v in acceptance['precheck'].values()),
                   gatelevel_passed=sum(v == 'pass' for v in acceptance['gatelevel'].values()))
    (BASE / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    shutil.copyfile(args.exporter_root / 'LICENSE', BASE / 'LICENSE.txt')
    print(f'Imported {len(report["tiles"])} tiles, {report["expanded_polygons"]:,} polygons.')


if __name__ == '__main__':
    main()
