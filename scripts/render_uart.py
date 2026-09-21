#!/usr/bin/env python3
"""Plot all four UART frames from the saved simulation samples."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'assets/protocol-emulator'
data = json.loads((root / 'uart-25.json').read_text())
wave, period = data['wave'], data['period']
start = next(i for i in range(1, len(wave)) if wave[i] == [0, 1] and wave[i-1][0] == 1)
frames = []
for index, expected in enumerate(data['bytes']):
    cycle = start + index * 10 * period
    bits = [wave[cycle + bit * period + period // 2][0] for bit in range(10)]
    assert bits[0] == 0 and bits[9] == 1
    assert sum(bits[bit+1] << bit for bit in range(8)) == expected
    assert all(sample[1] == 1 for sample in wave[cycle:cycle+10*period])
    frames.append((cycle, expected))
first, last = start-period, start+len(frames)*10*period+period
x = lambda cycle: 70 + (cycle-first)/(last-first)*1090
y = lambda bit: 90 if bit else 160
points = [(x(first), y(wave[first][0]))]
for cycle in range(first+1, last+1):
    if wave[cycle][0] != wave[cycle-1][0]:
        points.extend([(x(cycle), y(wave[cycle-1][0])), (x(cycle), y(wave[cycle][0]))])
points.append((x(last), y(wave[last][0])))
labels = ''.join(f'<text x="{x(cycle+5*period):.1f}" y="63" text-anchor="middle">0x{value:02X}</text>' for cycle, value in frames)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="280" viewBox="0 0 1200 280"><rect width="1200" height="280" fill="#fafaf8"/><g font-family="monospace" font-size="20" fill="#0a0a0b"><text x="30" y="34">UART 8N1 · TX samples · {period} cycles / bit</text>{labels}<text x="24" y="97">1</text><text x="24" y="167">0</text><text x="70" y="225">Cycle {first}</text><text x="1160" y="225" text-anchor="end">Cycle {last}</text><text x="70" y="260" font-size="16">Simulation at 88f5210 · Run 35488919040</text></g><path d="M70 190H1160" stroke="#62666b"/><polyline points="{' '.join(f'{a:.2f},{b}' for a,b in points)}" fill="none" stroke="#1530a6" stroke-width="3"/></svg>'''
(root / 'uart-waveform.svg').write_text(svg+'\n')
manifest = json.loads((root / 'checksums.json').read_text())
manifest['files']['uart-waveform.svg'] = hashlib.sha256((root / 'uart-waveform.svg').read_bytes()).hexdigest()
(root / 'checksums.json').write_text(json.dumps(manifest, indent=2)+'\n')
print('Plotted four decoded UART frames, including the final stop bit.')
