#!/usr/bin/env python3
"""Build lossless raster levels from supersampled, original-coordinate renders."""
import hashlib
import json
import math
import shutil
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'assets/protocol-emulator/v2'
SOURCE = BASE/'layout-447b3df'
OUT = BASE/'raster-v1'
W, H, GUTTER = 1024, 1129, 1


def main(scratch):
    meta = json.loads((SOURCE/'manifest.json').read_text())
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    layers = list(map(str, range(len(meta['layers']))))
    levels = [{'z':z, 'columns':2**z, 'rows':max(1,2**(z-1)),
               'width':W*2**z, 'height':math.ceil(H*2**(z-1))} for z in range(6)]
    def load(z, layer, x, y):
        p = scratch/str(z)/layer/f'{x}-{y}.png'
        return Image.open(p).convert('RGBA') if p.exists() else None
    # Downsample adjacent children together, preserving all layers and opacity.
    for z in range(4,-1,-1):
        level = levels[z]
        for layer in layers:
            dest = scratch/str(z)/layer
            dest.mkdir(parents=True, exist_ok=True)
            for y in range(level['rows']):
                for x in range(level['columns']):
                    image = Image.new('RGBA',(W*2,H*2 if z else H))
                    for j in range(2 if z else 1):
                        for i in range(2):
                            child = load(z+1,layer,x*2+i,y*2+j)
                            if child: image.paste(child,(i*W,j*H))
                    image = image.resize((W,H if z else level['height']),Image.Resampling.LANCZOS)
                    if image.getbbox(): image.save(dest/f'{x}-{y}.png')
        print(f'Built raster level {z}',flush=True)
    # Precomposite the default all-layer view to minimize startup requests.
    for level in levels:
        z=level['z']; dest=scratch/str(z)/'all'; dest.mkdir(parents=True,exist_ok=True)
        for y in range(level['rows']):
            for x in range(level['columns']):
                image=Image.new('RGBA',(W,H if z else level['height']),'#101827')
                for layer in layers:
                    child=load(z,layer,x,y)
                    if child: image.alpha_composite(child)
                image.save(dest/f'{x}-{y}.png')
    # Add neighboring edge pixels as texture gutters to prevent tile seams.
    tiles={}
    for level in levels:
        z=level['z']; height=H if z else level['height']
        for layer in ['all']+layers:
            dest=OUT/str(z)/layer; dest.mkdir(parents=True,exist_ok=True)
            for y in range(level['rows']):
                for x in range(level['columns']):
                    center=load(z,layer,x,y)
                    if center is None or not center.getbbox(): continue
                    image=Image.new('RGBA',(W+2,height+2))
                    image.paste(center,(1,1))
                    for dy in [-1,0,1]:
                        for dx in [-1,0,1]:
                            if not (dx or dy):continue
                            other=load(z,layer,x+dx,y+dy)
                            if other is None:continue
                            box=(W-1 if dx<0 else 0,height-1 if dy<0 else 0,
                                 W if dx<=0 else 1,height if dy<=0 else 1)
                            image.paste(other.crop(box),(0 if dx<0 else W+1 if dx>0 else 1,
                                                         0 if dy<0 else height+1 if dy>0 else 1))
                    name=f'{z}/{layer}/{x}-{y}.webp'; p=OUT/name
                    image.save(p,'WEBP',lossless=True,method=4)
                    tiles[name]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
        print(f'Encoded raster level {z}',flush=True)
    manifest={'schema':1,'source_sha256':meta['source_sha256'],'bounds':meta['bounds'],
              'layers':[l['key'] for l in meta['layers']], 'tile_width':W,'tile_height':H,
              'gutter':GUTTER,'levels':levels,'tiles':tiles,
              'render':{'source':'original polygon coordinates','supersampling':2,
                        'palette':[l['color'] for l in meta['layers']],
                        'composite':'source-over','opacity':0.65,'structural_opacity':0.08,
                        'format':'lossless WebP','overview':'rasterized geometry'}}
    (OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    overview=load(0,'all',0,0).convert('RGB')
    overview.save(BASE/'overview.webp','WEBP',lossless=True)
    print(f'Pyramid: {len(tiles)} tiles, {sum(t["bytes"] for t in tiles.values()):,} bytes',flush=True)


if __name__=='__main__':main(Path(sys.argv[1]))
