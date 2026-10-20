#!/usr/bin/env python3
"""Validate published routes, references, shared chrome, evidence, and résumé."""
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote
from xml.etree import ElementTree
from site_html import parse

ROOT = Path(__file__).resolve().parents[1]

def check_v2_assets(files, page):
    base = ROOT/'assets/protocol-emulator/v2'
    provenance = json.loads((base/'checksums.json').read_text())
    for name, expected in provenance['files'].items():
        path = base/name
        assert path.is_file() and path.resolve().is_relative_to(base), name
        assert str(path.relative_to(ROOT)) in files, f'Unpublished V2 asset: {name}'
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, f'V2 checksum: {name}'
    layout = base/'layout-447b3df'
    manifest = json.loads((layout/'manifest.json').read_text())
    summary = json.loads((base/'summary.json').read_text())
    assert manifest['source_sha256'] == summary['gds_sha256']
    assert manifest['provenance']['physical_source_commit'] == summary['physical_source_commit']
    assert manifest['independent_inventory_matches'] is True
    assert manifest['geometry_simplified'] is False
    assert manifest['hierarchy_depth_limit'] is None and manifest['layers_omitted'] == []
    assert sum(layer['polygons'] for layer in manifest['layers']) == manifest['expanded_polygons']
    for key, tile in manifest['tiles'].items():
        path = layout/'tiles'/f'{key}.jsonl.gz'
        assert path.stat().st_size == tile['bytes']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == tile['sha256'], key
    raster = json.loads((base/'raster-v1/manifest.json').read_text())
    assert raster['source_sha256'] == manifest['source_sha256']
    assert raster['bounds'] == manifest['bounds']
    assert raster['layers'] == [layer['key'] for layer in manifest['layers']]
    assert [level['width'] for level in raster['levels']] == [1024,2048,4096,8192,16384,32768]
    for level in raster['levels']:
        for y in range(level['rows']):
            for x in range(level['columns']):
                assert f"{level['z']}/all/{x}-{y}.webp" in raster['tiles']
    for name, expected in raster['tiles'].items():
        path = base/'raster-v1'/name
        assert path.stat().st_size == expected['bytes'], name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected['sha256'], name
    archive = layout/'selected-layout.tar.gz'
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == manifest['provenance']['archive_sha256']
    viewers = [n for n in page.find() if 'data-gds-viewer' in n.attrs]
    assert len(viewers) == 1 and viewers[0].attrs['data-gds-hash'] == manifest['source_sha256']
    assert not page.find('iframe'), 'The V2 viewer must run natively'
    assert 'layout/' not in ''.join(n.attrs.get('src', '') for n in page.find('script'))
    for old in ['200 tests', 'draft PR #9', 'Electrical gate failing']:
        assert old not in page.text, f'Stale V1 status: {old}'


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
    check_v2_assets(files, docs['protocol-emulator.html'])
    for folder in ('testos', 'scope'):
        manifest = json.loads((ROOT/'assets'/folder/'checksums.json').read_text())
        for name, expected in manifest['files'].items():
            assert hashlib.sha256((ROOT/'assets'/folder/name).read_bytes()).hexdigest() == expected, name
        for video in (ROOT/'assets'/folder).glob('*.*'):
            if video.suffix in ('.mp4', '.webm'):
                assert video.stat().st_size < 5_000_000, video
        assert manifest['frame_count'] / manifest['frames_per_second'] <= 30
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
