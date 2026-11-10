"""Crop article details to 16:10. Full capture records remain unchanged."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# The selected regions show shell startup, network configuration/download, and
# the root directory listing. Captions link to the complete original records.
REGIONS = {'boot': (0, 300, 320, 500), 'download': (0, 500, 320, 700),
           'disk-nvme': (0, 360, 320, 560)}
for name, box in REGIONS.items():
    source = Image.open(ROOT / f'assets/testos/{name}.png').convert('RGB')
    assert 0 <= box[0] < box[2] <= source.width
    assert 0 <= box[1] < box[3] <= source.height
    crop = source.crop(box)
    assert crop.width * 10 == crop.height * 16
    crop.resize((720, 450), Image.Resampling.NEAREST).save(ROOT / f'assets/testos/{name}.webp', lossless=True)
