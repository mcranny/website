#!/usr/bin/env python3
"""Generate compact display images and lazy indexes from verified raster assets.

Original raster pyramids and polygon geometry remain the source records.
Display composites use WebP quality 85; individual layers remain lossless.
Run explicitly when publishing a new display revision, not during builds.
"""
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def record(path):
    return {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, separators=(',', ':')) + '\n')

def main():
    for version in ('v2', 'v3'):
        base = ROOT/'assets/protocol-emulator'/version
        output = base/'display-v1'
        if output.exists():
            raise ValueError(f'Refusing to replace immutable display assets: {output}')
        output.mkdir()
        raster = json.loads((base/'raster-v1/manifest.json').read_text())
        originals = dict(raster['tiles'])
        def encode(name):
            path = output/name
            path.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(base/'raster-v1'/name) as im:
                im.save(path, 'WEBP', quality=85, method=4)
            return name, dict(record(path), url='../display-v1/'+name)
        composites = [name for name in originals if '/all/' in name]
        with ThreadPoolExecutor(max_workers=4) as pool:
            raster['tiles'].update(dict(pool.map(encode, composites)))
        # Responsive article images are display derivatives, with original images retained.
        for name in ('overview', 'detail'):
            with Image.open(base/(name+'.webp')) as im:
                for width in (640, im.width):
                    resized = im.resize((width, round(im.height*width/im.width)), Image.Resampling.LANCZOS)
                    resized.save(output/f'{name}-{width}.webp', 'WEBP', quality=85, method=4)
        shards = {}
        for level in raster['levels']:
            for layer in ['all', *map(str, range(len(raster['layers'])))]:
                key = f"{level['z']}/{layer}"
                tiles = {k:v for k,v in raster['tiles'].items() if k.startswith(key+'/')}
                path = output/'index'/f'{key}.json'
                write_json(path, tiles)
                shards[key] = record(path)
        bootstrap = {k:v for k,v in raster.items() if k != 'tiles'}
        bootstrap.update(tiles={'0/all/0-0.webp':raster['tiles']['0/all/0-0.webp']}, indexes=shards,
                         display={'format':'WebP', 'quality':85, 'source':'../raster-v1/manifest.json'})
        write_json(output/'manifest.json', bootstrap)
        print(version, 'bootstrap bytes', (output/'manifest.json').stat().st_size,
              'overview bytes', (output/'overview-640.webp').stat().st_size,
              'composites',len(composites), flush=True)

if __name__ == '__main__':
    main()
