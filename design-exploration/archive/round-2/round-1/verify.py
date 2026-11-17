"""Read-only checks for the exploration. Does not run product tests.

Usage: python3 -B design-exploration/verify.py [--serve-check]
The optional check needs the existing preview.py server on port 8765.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.frames, self.scripts, self.ids = [], [], [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('src', 'href'):
            if key in attrs:
                self.refs.append((tag, attrs[key]))
        if tag == 'iframe':
            self.frames.append(attrs)
        if tag == 'script':
            self.scripts.append(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])


def run(serve_check):
    reference_count = 0
    resources = set()
    pages = list(ROOT.glob('*.html'))
    for path in pages:
        parsed = Page()
        parsed.feed(path.read_text(encoding='utf-8'))
        assert len(parsed.ids) == len(set(parsed.ids)), f'Duplicate IDs: {path.name}'
        for tag, url in parsed.refs:
            reference_count += 1
            parts = urlsplit(url)
            assert not parts.scheme and not parts.netloc and not url.startswith('/'), f'Non-relative reference: {path.name} {url}'
            target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
            assert target.is_relative_to(ROOT), f'Reference leaves exploration: {url}'
            assert target.exists(), f'Missing reference: {path.name} {url}'
            resources.add(target)
            if parts.fragment and target.suffix == '.html':
                destination = Page()
                destination.feed(target.read_text(encoding='utf-8'))
                assert parts.fragment in destination.ids, f'Missing anchor: {url}'
        if path.name.startswith(('r0-', 'r1-')):
            assert not parsed.scripts, f'Unexpected screen script: {path.name}'
    print(f'PASS: {len(pages)} HTML files; {reference_count} relative references; unique IDs and existing anchors.')

    fragment = (ROOT / 'screen.html').read_text(encoding='utf-8')
    screens = list(ROOT.glob('r0-*.html')) + list(ROOT.glob('r1-*.html'))
    assert len(screens) == 7
    assert all(path.read_text(encoding='utf-8').count(fragment) == 1 for path in screens)
    parsed = Page()
    parsed.feed((ROOT / 'comparison.html').read_text(encoding='utf-8'))
    assert len(parsed.frames) == 7
    assert all(frame.get('title') and frame.get('sandbox') == 'allow-same-origin' for frame in parsed.frames)
    assert len(parsed.scripts) == 1 and parsed.scripts[0]['src'] == 'comparison.js'
    print('PASS: all seven screens contain the exact shared fragment; isolated, titled frames.')
    print('Shared fragment SHA256:', hashlib.sha256(fragment.encode()).hexdigest())

    for path in ROOT.glob('*.css'):
        assert not re.search(r'@import|url\s*\(|@font-face', path.read_text()), f'Unexpected CSS resource: {path.name}'
    javascript = (ROOT / 'comparison.js').read_text(encoding='utf-8')
    javascript = re.sub(r'/\*.*?\*/|//[^\n]*', '', javascript, flags=re.S)
    assert not re.search(r'\b(fetch|localStorage|sessionStorage|XMLHttpRequest|supabase|print)\b', javascript)
    print('PASS: no product scripts, external assets, font loads or data API calls in preview sources (static scan).')

    # Independently check contrast output with known boundary cases and a
    # separate implementation. This is arithmetic, not rendered accessibility.
    def ratio(first, second):
        def lightness(value):
            channels = [int(value[i:i+2], 16)/255 for i in (1, 3, 5)]
            components = [v/12.92 if v <= 0.04045 else pow((v+0.055)/1.055, 2.4) for v in channels]
            return 0.2126*components[0] + 0.7152*components[1] + 0.0722*components[2]
        a, b = lightness(first), lightness(second)
        return (max(a, b)+.05)/(min(a, b)+.05)
    assert abs(ratio('#000000', '#FFFFFF') - 21) < 1e-9
    assert abs(ratio('#626262', '#626262') - 1) < 1e-9
    results = json.loads((ROOT / 'contrast.json').read_text())['directions']
    assert len(results) == 7 and all(len(rows) == 17 for rows in results.values())
    for ident, rows in results.items():
        for row in rows:
            actual = min(ratio(row['foreground'], bg) for bg in row['background'])
            assert abs(actual - row['ratio']) <= .0005, (ident, row['pair'])
            assert row['meets_4_5'] == (actual >= 4.5), (ident, row['pair'])
        if ident.startswith('R1-'):
            assert all(row['meets_4_5'] for row in rows), ident
    assert sum(not row['meets_4_5'] for row in results['R0-0']) == 6
    print('PASS: 119 text pairs recalculated; all 102 R1 pairs >= 4.5:1; 6 R0 failures correctly retained.')

    if serve_check:
        resources.add(ROOT / 'comparison.html')
        for path in sorted(resources):
            with urlopen('http://127.0.0.1:8765/design-exploration/' + path.relative_to(ROOT).as_posix()) as response:
                assert response.status == 200 and response.read() == path.read_bytes(), path.name
        print(f'PASS: {len(resources)} linked local resources returned HTTP 200 and matched disk bytes.')
    else:
        print('HTTP serving: NOT MEASURED in this invocation (use --serve-check).')
    print('Browser rendering, interaction, screenshots, font resolution, Safari, print and PDF: NOT MEASURED.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serve-check', action='store_true')
    run(parser.parse_args().serve_check)
