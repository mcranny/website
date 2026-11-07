#!/usr/bin/env python3
"""Render a physical viewport from verified original-geometry raster tiles."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('base', type=Path)
    p.add_argument('--box', nargs=4, type=float, required=True, metavar=('LEFT', 'BOTTOM', 'RIGHT', 'TOP'))
    args = p.parse_args()
    raster = args.base/'raster-v1'
    meta = json.loads((raster/'manifest.json').read_text())
    level = meta['levels'][-1]
    left, bottom, right, top = args.box
    b = meta['bounds']
    assert b[0] <= left < right <= b[2] and b[1] <= bottom < top <= b[3]
    sx, sy = level['width']/(b[2]-b[0]), level['height']/(b[3]-b[1])
    pixels = (round((left-b[0])*sx), round((b[3]-top)*sy), round((right-b[0])*sx), round((b[3]-bottom)*sy))
    w, h = meta['tile_width'], meta['tile_height']
    x0, y0 = pixels[0]//w, pixels[1]//h
    x1, y1 = math.ceil(pixels[2]/w), math.ceil(pixels[3]/h)
    result = Image.new('RGB', ((x1-x0)*w, (y1-y0)*h))
    for y in range(y0,y1):
        for x in range(x0,x1):
            name = f"{level['z']}/all/{x}-{y}.webp"
            data = (raster/name).read_bytes()
            assert hashlib.sha256(data).hexdigest() == meta['tiles'][name]['sha256']
            with Image.open(raster/name) as tile:
                g = meta['gutter']
                result.paste(tile.crop((g,g,w+g,h+g)), ((x-x0)*w,(y-y0)*h))
    result = result.crop((pixels[0]-x0*w,pixels[1]-y0*h,pixels[2]-x0*w,pixels[3]-y0*h))
    height = round(1400*(top-bottom)/(right-left))
    result.resize((1400,height),Image.Resampling.LANCZOS).save(args.base/'detail.webp', 'WEBP', lossless=True)
    (args.base/'render.json').write_text(json.dumps({'source_sha256':meta['source_sha256'], 'detail_bounds_um':args.box,
        'detail_pixels':[1400,height], 'source':'checksum-verified original-coordinate raster pyramid'},indent=2)+'\n')


if __name__ == '__main__':
    main()
