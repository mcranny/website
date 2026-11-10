#!/usr/bin/env python3
"""Create a zoomed 16:10 playback view, following the latest terminal output.

Original captures remain unchanged. Each frame retains the recent output lines
in chronological order. The crop expands for long lines and follows new output
vertically. Nearest-neighbor scaling keeps terminal glyphs sharp. The article
links to the uncropped recording for the complete boot log.
"""
import argparse,json,subprocess
from pathlib import Path
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg',default='ffmpeg');args=parser.parse_args()
record=json.loads((ROOT/'assets/testos/checksums.json').read_text())

def viewport(frame):
    background=Image.new('RGB',frame.size,frame.getpixel((1023,767)))
    foreground=ImageChops.difference(frame,background).convert('L').point(lambda value:255 if value>40 else 0)
    bounds=foreground.getbbox()
    bottom=bounds[3] if bounds else 200
    width=320
    while True:
        height=width*5//8
        top=max(0,min(768-height,bottom-height+12))
        top=(top//12)*12  # Start on a terminal row, not through a glyph.
        recent=foreground.crop((0,top,1024,top+height)).getbbox()
        needed=min(1024,recent[2]+16) if recent else 320
        if needed<=width:break
        width=min(1024,width+160)
    assert needed<=width, 'Visible line exceeds the crop'
    return frame.crop((0,top,width,top+height)).resize((960,600),Image.Resampling.NEAREST)

for ext,codec in [('mp4',['-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart']),('webm',['-c:v','libvpx-vp9','-crf','22','-b:v','0'])]:
    source=ROOT/f'assets/testos/boot.{ext}'
    raw=subprocess.check_output([args.ffmpeg,'-v','error','-i',str(source),'-f','rawvideo','-pix_fmt','rgb24','-'])
    stride=1024*768*3
    assert len(raw)==record['frame_count']*stride,'Unexpected capture length'
    encode=subprocess.Popen([args.ffmpeg,'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','960x600','-r',str(record['frames_per_second']),'-i','-',*codec,str(ROOT/f'assets/testos/boot-framed.{ext}')],stdin=subprocess.PIPE)
    try:
        for offset in range(0,len(raw),stride):
            frame=Image.frombytes('RGB',(1024,768),raw[offset:offset+stride])
            encode.stdin.write(viewport(frame).tobytes())
    finally:
        encode.stdin.close()
    assert encode.wait()==0,'Video encoding failed'
poster=Image.open(ROOT/'assets/testos/boot-poster.png').convert('RGB')
viewport(poster).save(ROOT/'assets/testos/boot-framed.webp',lossless=True)
