"""Read-only shortlist/archive checks. Browser geometry is NOT MEASURED here."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, quote
from urllib.request import urlopen
import hashlib
import json
import os
import re
import sys

ROOT = Path(__file__).resolve().parent
KEPT = ['R0-0', 'R3-1', 'R3-2']
PAGES = ['r0-current.html', 'r3-1-bluebold.html', 'r3-2-berryround.html']


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.refs, self.frames, self.ids = [], [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        self.refs.extend(attrs[k] for k in ('src', 'href') if k in attrs)
        if tag == 'iframe':
            self.frames.append(attrs)


def digest(content):
    return hashlib.sha256(content).hexdigest()


def target(page, ref):
    parts = urlsplit(ref)
    assert not parts.scheme and not parts.netloc and not parts.path.startswith('/'), (page, ref)
    path = (page.parent / unquote(parts.path)).resolve() if parts.path else page
    assert path.is_relative_to(ROOT) and 'harness-shots' not in path.parts, (page, ref)
    assert path.is_file(), (page, ref)
    if parts.fragment and path.suffix == '.html':
        assert parts.fragment in Page(path.read_text()).ids, (page, ref)
    return path


def gallery_check(text):
    page = Page(text)
    assert [f['src'] for f in page.frames] == PAGES, 'Shortlist must contain only baseline + two finalists, in order'
    assert len(page.ids) == len(set(page.ids)), 'Duplicate ids'
    assert all(f.get('title') for f in page.frames)
    for frame in page.frames[1:]:
        assert set(frame['sandbox'].split()) == {'allow-same-origin', 'allow-scripts'}


def verify():
    manifest = json.loads((ROOT / 'archive/shortlist-preservation.json').read_text())
    before = manifest['before']
    for name in PAGES + ['screen.html', 'screen.css', 'themes.css', 'themes-round2.css',
                         'typography-round3.css', 'comparison.css', 'comparison-round2.css',
                         'comparison-round3.css', 'comparison-round3.js']:
        assert digest((ROOT / name).read_bytes()) == before[name], name
    print('PASS: three active pages, original content, font stacks, palettes and shared CSS unchanged')

    snapshots = {name: value for name, value in before.items() if name.startswith(('round-1/', 'round-2/'))}
    for name, value in snapshots.items():
        assert digest((ROOT / 'archive' / name).read_bytes()) == value, name
    for name in manifest['moved_versions']:
        assert not (ROOT / name).exists(), name
        text = (ROOT / 'archive' / name).read_text()
        # Reverse only the authorized link rebasing and compare to pre-move bytes.
        original = text.replace('href="../', 'href="').replace('src="../', 'src="')
        original = original.replace('href="round-3/comparison.html', 'href="comparison.html')
        assert digest(original.encode()) == before[name], name
    assert not (ROOT / 'round-1').exists() and not (ROOT / 'round-2').exists()
    snapshot = (ROOT / 'archive/round-3/comparison.html').read_text()
    for prefix in ('../../', '../'):
        snapshot = snapshot.replace(f'href="{prefix}', 'href="').replace(f'src="{prefix}', 'src="')
    assert digest(snapshot.encode()) == before['comparison.html'], 'Round 3 comparison content changed'
    assert len(Page(snapshot).frames) == 18
    assert digest((ROOT / 'archive/round-3/typography-round3.js').read_bytes()) == before['typography-round3.js']
    print(f'PASS: {len(snapshots)} snapshot files byte-identical; 15 moved pages and original 18-card comparison differ only in links')

    current = json.loads((ROOT / 'directions.json').read_text())
    old = json.loads((ROOT / 'archive/round-3/directions.json').read_text())
    assert [d['id'] for d in current] == [d['id'] for d in old] and len(current) == 18
    for actual, expected in zip(current, old):
        for key, value in expected.items():
            if key != 'geometry_strategy':
                assert actual[key] == value, (actual['id'], key)
        assert actual['in_comparison'] == (actual['id'] in KEPT)
        assert actual['shortlist_status'] == ('baseline' if actual['id'] == 'R0-0' else 'shortlisted' if actual['id'] in KEPT else 'archived')
        assert target(ROOT / 'directions.json', actual['page'])
        if not actual['in_comparison']:
            assert actual['archive_reason'] == 'Gavin 第 3 輪後只留 R3-1、R3-2'
    for round_id in (2, 3):
        assert json.loads((ROOT / f'round{round_id}-directions.json').read_text()) == [d for d in current if d['round'] == round_id]
    gallery = (ROOT / 'comparison.html').read_text()
    gallery_check(gallery)
    for lineage in ('R3-1 ← R2-1 ← R1-1 + R1-4', 'R3-2 ← R2-2 ← R1-2 + R1-4'):
        assert lineage in gallery
    print('PASS: 18 records retained; consistent shortlist/archive metadata and 3 ordered comparison frames')

    # Invalid states must fail; these fixtures stay in memory, never on disk.
    failures = [lambda: gallery_check(gallery.replace('src="r3-2-berryround.html"', 'src="archive/r3-3-blueming.html"')),
                lambda: target(ROOT / 'comparison.html', 'missing.css'),
                lambda: target(ROOT / 'comparison.html', 'https://example.invalid/font.css'),
                lambda: target(ROOT / 'comparison.html', '../index.html'),
                lambda: target(ROOT / 'comparison.html', 'r0-current.html#missing-anchor')]
    for check in failures:
        try:
            check()
        except AssertionError:
            continue
        raise AssertionError('Invalid fixture was accepted')
    print('PASS: wrong finalist, missing file, external URL, out-of-scope path and missing anchor rejected')

    seen, html_count, ref_count = set(), 0, 0
    for directory, dirs, files in os.walk(ROOT):
        dirs[:] = [name for name in dirs if name != 'harness-shots']
        for name in files:
            path = Path(directory) / name
            if path.suffix == '.html':
                html_count += 1
                page = Page(path.read_text())
                assert len(page.ids) == len(set(page.ids)), path
                for ref in page.refs:
                    seen.add(target(path, ref))
                    ref_count += 1
                seen.add(path)
            elif path.suffix == '.js' and path.name.startswith('layout-check'):
                for ref in re.findall(r"'([^']+\.html)'", path.read_text()):
                    seen.add(target(path, ref))
                seen.add(path)
    for path in [ROOT / 'README.md', ROOT / 'archive/README.md', *sorted((ROOT / 'archive/round-3').glob('*.md'))]:
        for ref in re.findall(r'\[[^\]]*\]\(([^\s)]+)\)', path.read_text()):
            if not urlsplit(ref).scheme:
                seen.add(target(path, ref))
    print(f'PASS: {html_count} HTML files, {ref_count} HTML references, archive index and dynamic observation-page paths resolve')
    if '--serve-check' in sys.argv:
        for path in sorted(seen):
            url = 'http://127.0.0.1:8765/design-exploration/' + quote(path.relative_to(ROOT).as_posix())
            with urlopen(url, timeout=5) as response:
                assert response.status == 200 and response.read() == path.read_bytes(), path
        print(f'PASS: {len(seen)} local resources returned HTTP 200 with matching bytes')
    print('NOT MEASURED: post-fix bounding boxes, r3Metrics, visual rendering, screenshots, Windows Chrome and iPhone Safari')


if __name__ == '__main__':
    verify()
