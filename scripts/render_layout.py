#!/usr/bin/env python3
"""Render a GDS and write a lossless Deep Zoom pyramid.

Requires klayout==0.30.12 and the libvips CLI. Supply the GDS and the
IHP PDK sg13cmos5l.lyp layer properties from the recorded physical run.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import klayout.lay as lay
import klayout.db as db


DIE_WIDTH, DIE_HEIGHT = 1289.28, 710.64
STRIPS = 4
VISIBLE = {name + '.drawing' for name in (
    'Activ', 'GatPoly', 'Cont', 'Metal1', 'Metal2', 'Metal3', 'Metal4',
    'TopMetal1', 'Via1', 'Via2', 'Via3', 'TopVia1')}


def configure_view(gds, layers):
    view = lay.LayoutView()
    view.load_layout(str(gds))
    view.max_hier()
    view.load_layer_props(str(layers))
    # Hide area markers and non-drawing datatypes, including .filler layers.
    layer = view.begin_layers()
    while not layer.at_end():
        properties = layer.current().dup()
        properties.dither_pattern = 0
        properties.visible = properties.name in VISIBLE
        properties.transparent = False
        view.set_layer_properties(layer, properties)
        layer.next()
    # Draw red Metal3 beneath cyan Metal1 and green Metal4. KLayout's boolean
    # transparency blends intersections to black instead of alpha compositing.
    layer = view.begin_layers()
    while not layer.at_end():
        if layer.current().name == 'Metal3.drawing':
            red = layer.current().dup()
            view.delete_layer(layer)
            break
        layer.next()
    else:
        raise ValueError('PDK layer properties are missing Metal3.drawing')
    layer = view.begin_layers()
    while not layer.at_end():
        if layer.current().name == 'Metal1.drawing':
            view.insert_layer(layer, red)
            break
        layer.next()
    else:
        raise ValueError('PDK layer properties are missing Metal1.drawing')
    # Filler/decap cells contain ordinary drawing shapes too. Hide their
    # instances for display only; the source layout is never modified or saved.
    hidden = []
    for cell in view.active_cellview().layout().each_cell():
        if cell.name.startswith(('sg13cmos5l_fill_', 'sg13cmos5l_decap_')):
            view.hide_cell(cell.cell_index(), 0)
            hidden.append(cell.name)
    for key, value in [('grid-visible', 'false'), ('grid-show-ruler', 'false'),
                       ('text-visible', 'false'), ('inst-visible', 'false'),
                       ('background-color', '#FFFFFF')]:
        view.set_config(key, value)
    return view, sorted(hidden)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('gds', type=Path)
    parser.add_argument('layers', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--run', required=True)
    parser.add_argument('--artifact-id', required=True, type=int)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new output directory, then review before replacing published tiles.')
    if not shutil.which('vips'):
        parser.error('The libvips CLI must be installed and on PATH.')
    view, hidden = configure_view(args.gds, args.layers)
    # Use the exact die bounds, with no cell-bounding-box or pixel-grid padding.
    bounds = db.DBox(0, 0, DIE_WIDTH, DIE_HEIGHT)
    # Equal-height strips let arrayjoin assemble without padding between rows.
    height = round(DIE_HEIGHT / 0.05 / STRIPS) * STRIPS
    width = round(height * DIE_WIDTH / DIE_HEIGHT)
    strip_height = height // STRIPS
    view.zoom_box(bounds)
    args.output.mkdir(parents=True)
    view.save_layer_props(str(args.output / 'solid-fills.lyp'))
    with tempfile.TemporaryDirectory() as temporary:
        paths = []
        for strip in range(STRIPS):
            box = db.DBox(bounds.left, bounds.top - (strip + 1) * DIE_HEIGHT / STRIPS,
                          bounds.right, bounds.top - strip * DIE_HEIGHT / STRIPS)
            path = Path(temporary) / f'strip{strip}.png'
            view.save_image_with_options(str(path), width, strip_height, 1, 1, 1, box, False)
            paths.append(str(path))
            print(f'Rendered strip {strip + 1}/{STRIPS}', flush=True)
        joined = str(Path(temporary) / 'layout.v')
        subprocess.run(['vips', 'arrayjoin', ' '.join(paths), joined, '--across', '1'], check=True)
        subprocess.run(['vips', 'dzsave', joined, str(args.output / 'layout'),
                        '--tile-size', '512', '--overlap', '1', '--depth', 'onepixel',
                        '--suffix', '.png[compression=6]', '--skip-blanks', '-1'], check=True)
        # The viewer only needs the DZI and tiles, not libvips' metadata sidecar.
        (args.output / 'layout_files' / 'vips-properties.xml').unlink(missing_ok=True)
        dzi = args.output / 'layout.dzi'
        dzi.write_text('\n'.join(line.rstrip() for line in dzi.read_text().splitlines()) + '\n')
        subprocess.run(['vips', 'thumbnail', joined, str(args.output / 'overview.png'),
                        '1612'], check=True)
    metadata = dict(commit=args.commit, run=args.run, artifact_id=args.artifact_id,
                    gds_sha256=hashlib.sha256(args.gds.read_bytes()).hexdigest(),
                    width=width, height=height,
                    target_box_um=[0, 0, DIE_WIDTH, DIE_HEIGHT],
                    micrometers_per_pixel={'x': DIE_WIDTH / width, 'y': DIE_HEIGHT / height},
                    tile_count=len(list((args.output / 'layout_files').rglob('*.png'))),
                    tile_size=512, overlap=1,
                    renderer='KLayout 0.30.12', fills='solid', background='white',
                    oversampling=1, pyramid='libvips dzsave from arrayjoin strips',
                    vips_version=subprocess.check_output(['vips', '--version'], text=True).strip(),
                    visible_layers=sorted(VISIBLE), hidden_cells=hidden,
                    layer_order='Metal3.drawing before Metal1.drawing and Metal4.drawing',
                    strips=STRIPS,
                    layer_properties_sha256=hashlib.sha256((args.output / 'solid-fills.lyp').read_bytes()).hexdigest())
    (args.output / 'render.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(f'Wrote {metadata["tile_count"]} tiles to {args.output}', flush=True)


if __name__ == '__main__':
    main()
