#!/usr/bin/env python3
"""Render V2 technical previews and a source-backed UART example (requires Pillow).

Usage: python scripts/render_v2_assets.py /path/to/released-examples.zip
Run import_v2_layout.py first. Geometry previews preserve the selected source;
only display rasterization is applied. The original gzip geometry is untouched.
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys
import zipfile
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/protocol-emulator/v2'
LAYOUT = OUT / 'layout-447b3df'
EXAMPLES_HASH = '50303a5042a66fc440c759680a0b63ffb9b9d5786be3dd38a732c20a5f173ef1'


def main(archive):
    manifest = json.loads((LAYOUT / 'manifest.json').read_text())
    layers = manifest['layers']
    if not (OUT/'raster-v1/manifest.json').exists():
        raise ValueError('Generate the multi-resolution overview with render_gds_pyramid.cjs first')
    # Same central viewport used by Inspect geometry, rasterized from the tile records.
    width,height=1400,700
    bounds=manifest['bounds']; span=(bounds[2]-bounds[0])/manifest['columns']*1.5
    cx,cy=(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2
    box=(cx-span/2,cy-span*height/width/2,cx+span/2,cy+span*height/width/2)
    dx,dy=(bounds[2]-bounds[0])/manifest['columns'],(bounds[3]-bounds[1])/manifest['rows']
    scale=width/span
    detail=Image.new('RGB',(width,height),'#101827')
    for key in manifest['tiles']:
        x,y=map(int,key.split('-')); left,bottom=bounds[0]+x*dx,bounds[1]+y*dy
        if left>box[2] or left+dx<box[0] or bottom>box[3] or bottom+dy<box[1]: continue
        tile=Image.new('RGB',(width,height),'#101827'); draw=ImageDraw.Draw(tile,'RGBA')
        for line in gzip.open(LAYOUT/'tiles'/f'{key}.jsonl.gz','rt'):
            index,rings=json.loads(line); layer=layers[index]
            alpha=.08 if layer['key'] in ['189/4','99/31'] else .65
            color=tuple(bytes.fromhex(layer['color'][1:]))+(round(alpha*255),)
            # This selected dataset uses simple polygons; reject holes rather than misrender.
            if len(rings)!=1: raise ValueError('Use a hole-aware renderer for this source')
            points=[((p[0]-box[0])*scale,(box[3]-p[1])*scale) for p in rings[0]]
            draw.polygon(points,fill=color)
        crop=(max(0,round((left-box[0])*scale)),max(0,round((box[3]-bottom-dy)*scale)),
              min(width,round((left+dx-box[0])*scale)),min(height,round((box[3]-bottom)*scale)))
        detail.paste(tile.crop(crop),crop)
    detail.save(OUT/'detail.webp',quality=92)
    data=Path(archive).read_bytes()
    assert hashlib.sha256(data).hexdigest()==EXAMPLES_HASH, 'Release example archive mismatch'
    with zipfile.ZipFile(archive) as z:
        results=json.loads(z.read('results.json'))
        example=next(r for r in results if r['name']=='uart_duplex_1000000')
        trace=json.loads(z.read('uart_duplex_1000000.trace.json'))
        for name in ['uart_tx_1000000.asm','uart_rx_1000000.asm']:
            (OUT/name).write_bytes(z.read(name))
    assert example['passed'] and not any(f['framing_error'] for f in example['checks']['tx_frames'])
    # External RX stimulus reconstructed exactly from examples/v2/run.py: cycle 20,
    # 25 cycles per bit, four 8N1 frames. Released example checks the received bytes.
    rx=[[0,1]]
    for frame,value in enumerate(example['checks']['rx']):
        for bit,level in enumerate([0]+[(value>>i)&1 for i in range(8)]+[1]):
            time=800+(frame*10+bit)*1000
            if level != rx[-1][1]: rx.append([time,level])
    sample={'software_source':'881495cb4d5a6270f5dd7625b1787d83f3059827',
        'example_archive_sha256':EXAMPLES_HASH,'simulation':'Python cycle model; no SPI host service simulated',
        'tx_transitions_ns':trace,'rx_stimulus_transitions_ns':rx,
        'rx_stimulus_origin':'Reconstructed from examples/v2/run.py uart(): cycle 20, 25 cycles per bit, 40 ns clock',
        'result':example}
    (OUT/'uart-duplex.json').write_text(json.dumps(sample,indent=2)+'\n')
    pieces=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360" role="img" aria-labelledby="title desc">',
        '<title id="title">V2 UART duplex cycle-model example at 1 Mbaud</title>',
        '<desc id="desc">Engine 0 transmits 00, 55, A5, FF. Engine 1 receives external stimulus 81, 5A, 01, FE. Four-byte preloaded burst.</desc>',
        '<rect width="1200" height="360" fill="#101827"/>',
        '<g font-family="system-ui,sans-serif" fill="#e2e8f0"><text x="28" y="34" font-size="19">UART duplex · 1 Mbaud · 25 cycles per bit</text>',
        '<text x="28" y="59" font-size="13" fill="#b7c5d8">Python cycle model · software 881495c · external RX stimulus reconstructed from the released example</text>']
    start,end=180,1170
    for us in range(0,46,5):
        x=start+us/45*(end-start)
        pieces.append(f'<path d="M{x} 80V298" stroke="#334155"/><text x="{x}" y="327" text-anchor="middle" font-size="13">{us}</text>')
    pieces.append('<text x="1168" y="348" text-anchor="end" font-size="13">time (µs)</text>')
    for row,(name,transitions,values,color,offset) in enumerate([
        ('Engine 0 TX',[[t,v&1] for t,v in trace],example['checks']['tx'],'#7dd3fc',160),
        ('RX stimulus',rx,example['checks']['rx'],'#c4b5fd',800)]):
        top=108+row*106; high,low=top,top+40
        pieces.append(f'<text x="28" y="{top+15}" font-size="15">{name}</text>')
        path=[f'M{start},{high}']; previous=1
        for time,value in transitions:
            x=start+time/45000*(end-start)
            path.extend([f'H{x:.2f}',f'V{high if value else low}']); previous=value
        path.append(f'H{end}')
        pieces.append(f'<path d="{" ".join(path)}" stroke="{color}" stroke-width="2.5" fill="none"/>')
        for i,value in enumerate(values):
            x=start+(offset+i*10000+5000)/45000*(end-start)
            pieces.append(f'<text x="{x}" y="{top+64}" text-anchor="middle" font-family="monospace" font-size="15" fill="{color}">0x{value:02X}</text>')
    pieces.append('</g></svg>'); (OUT/'uart-duplex.svg').write_text('\n'.join(pieces)+'\n')
    (OUT/'render.json').write_text(json.dumps({'gds_sha256':manifest['source_sha256'],
        'overview':'Multi-resolution original-coordinate raster; source-over compositing; all 16 layers',
        'detail':{'bounds_um':box,'size_px':[width,height],'source':'original gzip polygon records; tile-boundary clipping'},
        'examples_archive_sha256':EXAMPLES_HASH},indent=2)+'\n')
    print('Rendered V2 overview, literal-geometry close-up and verified UART example.')


if __name__=='__main__': main(sys.argv[1])
