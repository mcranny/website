#!/usr/bin/env python3
"""Validate published routes, references, shared chrome, evidence, and résumé."""
import hashlib
import json
import math
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote
from xml.etree import ElementTree
from site_html import parse

ROOT = Path(__file__).resolve().parents[1]

def check(pdf_text=True):
    files = json.loads((ROOT / 'scripts/public-files.json').read_text())
    assert len(files) == len(set(files)), 'Duplicate public path'
    assert len(files) <= 20000, 'Cloudflare free-plan asset count exceeded'
    for name in files:
        path = ROOT / name
        assert path.is_file() and not path.is_symlink() and '..' not in Path(name).parts, name
        assert not name.startswith('/') and path.resolve().is_relative_to(ROOT), name
        assert path.stat().st_size <= 25 * 1024 * 1024, f'Asset exceeds 25 MiB: {name}'
    docs = {p: parse(ROOT / p) for p in files if p.endswith('.html')}
    headers = []
    for name, doc in docs.items():
        text = (ROOT / name).read_text()
        header = re.search(r'<header class="topbar">.*?</header>', text, re.S)[0]
        headers.append(re.sub(r' aria-current="page"', '', header))
        nodes = doc.find()
        ids = [n.attrs['id'] for n in nodes if 'id' in n.attrs]
        assert len(ids) == len(set(ids)), f'Duplicate ID in {name}'
        assert len(doc.find('h1')) == 1, name
        for node in nodes:
            if node.tag == 'img':
                assert all(k in node.attrs for k in ('alt','width','height')), f'Image dimensions: {name}'
            values = [node.attrs.get(attr) for attr in ('href', 'src', 'poster')]
            values += [part.strip().split()[0] for part in node.attrs.get('srcset', '').split(',') if part.strip()]
            for value in values:
                if not value: continue
                url = urlsplit(value)
                if url.scheme or url.netloc: continue
                path = unquote(url.path).lstrip('/')
                target = path or name
                if url.path == '/': target = 'index.html'
                if not Path(target).suffix: target += '.html'
                assert target in files, f'{name}: unpublished {value}'
                if url.fragment:
                    assert target in docs and any(n.attrs.get('id') == unquote(url.fragment) for n in docs[target].find()), f'{name}: missing fragment {value}'
    assert len(set(headers)) == 1, 'Shared header drift'
    routes = {n.text.removeprefix('https://mcranny.net/') for n in ElementTree.parse(ROOT/'sitemap.xml').iter() if n.tag.endswith('loc')}
    assert routes == {'' if p == 'index.html' else p[:-5] for p in docs if p != '404.html'}, 'Sitemap mismatch'
    for line in (ROOT/'_redirects').read_text().splitlines():
        if line and not line.startswith('#'):
            target = line.split()[1].lstrip('/') or 'index'
            assert target + '.html' in docs, f'Redirect: {line}'
    for p in (ROOT/'css').glob('*.css'):
        assert p.read_text().count('{') == p.read_text().count('}'), f'CSS braces: {p}'
    provenance = json.loads((ROOT/'assets/protocol-emulator/checksums.json').read_text())
    for name, expected in provenance['files'].items():
        assert hashlib.sha256((ROOT/'assets/protocol-emulator'/name).read_bytes()).hexdigest() == expected, name
    for folder in ('testos', 'scope'):
        manifest = json.loads((ROOT/'assets'/folder/'checksums.json').read_text())
        for name, expected in manifest['files'].items():
            assert hashlib.sha256((ROOT/'assets'/folder/name).read_bytes()).hexdigest() == expected, name
        for video in (ROOT/'assets'/folder).glob('*.*'):
            if video.suffix in ('.mp4', '.webm'):
                assert video.stat().st_size < 5_000_000, video
        assert manifest['frame_count'] / manifest['frames_per_second'] <= 30
    layout = ROOT/'assets/protocol-emulator/layout'
    dzi = ElementTree.parse(layout/'layout.dzi').getroot()
    size = dzi.find('{http://schemas.microsoft.com/deepzoom/2008}Size')
    width, height = int(size.attrib['Width']), int(size.attrib['Height'])
    tile_size, count = int(dzi.attrib['TileSize']), 0
    max_level = math.ceil(math.log2(max(width, height)))
    for level in range(max_level + 1):
        scale = 2 ** (max_level - level)
        for x in range(math.ceil(math.ceil(width / scale) / tile_size)):
            for y in range(math.ceil(math.ceil(height / scale) / tile_size)):
                tile = layout/'layout_files'/str(level)/f'{x}_{y}.png'
                assert str(tile.relative_to(ROOT)) in files, f'Missing layout tile: {tile}'
                count += 1
    assert count == json.loads((layout/'render.json').read_text())['tile_count']
    fingerprint = json.loads((ROOT/'scripts/resume-fingerprint.json').read_text())
    for name in ('scripts/resume-content.json', 'resume.html', 'assets/Matthew-Cranny-Resume.pdf'):
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == fingerprint[name], f'Regenerate résumé: {name}'
    if not pdf_text:
        print(f'Checked {len(docs)} pages, {len(files)} public files, references, shared navigation, evidence and résumé fingerprints.')
        return
    from pypdf import PdfReader
    pdf = PdfReader(ROOT/'assets/Matthew-Cranny-Resume.pdf')
    assert len(pdf.pages) == 1, 'Public résumé must fit one page'
    normalize = lambda value: re.sub(r'\s+', '', value)
    pdf_text = normalize(' '.join(page.extract_text() for page in pdf.pages))
    resume = docs['resume.html']
    for section in resume.find(cls='resume-section'):
        for node in section.find('li') + section.find('td') + section.find('h3'):
            assert normalize(node.text) in pdf_text, f'PDF résumé drift: {node.text}'
        for item in section.find(cls='resume-entry-head'):
            for node in item.find('p') + item.find('code'):
                assert normalize(node.text) in pdf_text, f'PDF role/date drift: {node.text}'
        for item in section.find(cls='readout'):
            for node in item.find('strong') + item.find('code'):
                assert normalize(node.text) in pdf_text, f'PDF skill drift: {node.text}'
    assert normalize(resume.find(cls='resume-summary')[0].text) in pdf_text, 'PDF summary drift'
    content = json.loads((ROOT/'scripts/resume-content.json').read_text())
    for entry in content['experience'] + content['projects']:
        for value in [entry['company'], entry['role'], entry['date'], entry['location']] + entry['bullets']:
            assert normalize(value) in normalize(resume.text) and normalize(value) in pdf_text, f'Source drift: {value}'
    title = 'Area Manager Intern - ICQA'
    assert title in docs['index.html'].text and title in resume.text and normalize(title) in pdf_text
    assert not re.search(r'<script>(.*?)</script>', (ROOT/'index.html').read_text(), re.S), 'Inline theme bootstrap'
    print(f'Checked {len(docs)} pages, {len(files)} public files, shared navigation, sitemap, fragments, evidence hashes, and one-page HTML/PDF consistency.')

if __name__ == '__main__':
    check()
