#!/usr/bin/env python3
"""Derive 16:10 playback files while preserving original capture records.

Pass a local ffmpeg executable. Verify that the discarded bottom 48 rows contain
only terminal background in every source frame, then extend that same background
to the right. No foreground pixels are cropped or rescaled.
"""
import argparse,subprocess
from pathlib import Path
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg',default='ffmpeg');args=parser.parse_args()
for ext,codec in [('mp4',['-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart']),('webm',['-c:v','libvpx-vp9','-crf','22','-b:v','0'])]:
    source=ROOT/f'assets/testos/boot.{ext}'
    raw=subprocess.check_output([args.ffmpeg,'-v','error','-i',str(source),'-f','rawvideo','-pix_fmt','rgb24','-'])
    stride=1024*768*3
    assert len(raw)%stride==0
    for offset in range(0,len(raw),stride):
        frame=Image.frombytes('RGB',(1024,768),raw[offset:offset+stride])
        bottom=frame.crop((0,720,1024,768))
        difference=ImageChops.difference(bottom,Image.new('RGB',bottom.size,(11,29,52)))
        assert difference.convert('L').getextrema()[1]<40,'Crop would remove foreground'
    subprocess.run([args.ffmpeg,'-v','error','-y','-i',str(source),'-vf','crop=1024:720:0:0,pad=1152:720:0:0:color=0x0b1d34',*codec,str(ROOT/f'assets/testos/boot-framed.{ext}')],check=True)
poster=Image.open(ROOT/'assets/testos/boot-poster.png').convert('RGB')
frame=Image.new('RGB',(1152,720),(11,29,52));frame.paste(poster.crop((0,0,1024,720)),(0,0));frame.save(ROOT/'assets/testos/boot-framed.webp',lossless=True)
