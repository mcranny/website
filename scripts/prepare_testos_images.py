"""Produce lossless article crops without changing original capture records.

Requires Pillow. The rectangles retain all non-background terminal content.
"""
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
for name, height in [('boot', 480), ('download', 700), ('disk-nvme', 560)]:
    source = Image.open(ROOT / f'assets/testos/{name}.png').convert('RGB')
    bounds = ImageChops.difference(source, Image.new('RGB', source.size, source.getpixel((1023, 767)))).getbbox()
    assert bounds and bounds[2] <= 600 and bounds[3] <= height, f'Crop would remove terminal content: {name}'
    source.crop((0, 0, 600, height)).save(ROOT / f'assets/testos/{name}.webp', lossless=True)
