"""Static delivery/HTTP checks only. This is NOT a browser geometry test.
All writes are disabled; no product tests or harness-shots are accessed.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from urllib.request import urlopen
import hashlib
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parent
UPDATED = {'comparison.html', 'directions.json', 'README.md', 'QUESTIONS.md', 'SOURCE-NOTES.md', 'VALIDATION.md'}


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags, self.ids, self.refs, self.frames = [], [], [], []
        self.in_body = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'body':
            self.in_body = True
        if self.in_body:
            self.tags.append(tag)
        if 'id' in a:
            self.ids.append(a['id'])
        for key in ('src', 'href'):
            if key in a:
                self.refs.append(a[key])
        if tag == 'iframe':
            self.frames.append(a)


def local_target(page, ref):
    parts = urlsplit(ref)
    assert not parts.scheme and not parts.netloc and not parts.path.startswith('/'), (page, ref)
    target = (page.parent / unquote(parts.path)).resolve() if parts.path else page.resolve()
    assert target.is_relative_to(ROOT.resolve()), (page, ref)
    assert target.is_file(), (page, ref)
    if parts.fragment and target.suffix == '.html':
        assert parts.fragment in Page(target.read_text()).ids, (page, ref)
    return target


def content_match(text, fragment):
    assert text.count(fragment) == 1, 'Original homepage fragment changed'


def verify():
    manifest = json.loads((ROOT / 'round2-preservation.json').read_text())['files']
    for rel, digest in manifest.items():
        assert hashlib.sha256((ROOT / 'round-2' / rel).read_bytes()).hexdigest() == digest, rel
        if rel not in UPDATED:
            assert hashlib.sha256((ROOT / rel).read_bytes()).hexdigest() == digest, rel
    print(f'PASS: {len(manifest)} archived hashes; {len(manifest) - len(UPDATED)} unchanged originals')
    old = json.loads((ROOT / 'round-2/directions.json').read_text())
    current = json.loads((ROOT / 'directions.json').read_text())
    new = json.loads((ROOT / 'round3-directions.json').read_text())
    assert current == old + new and len(new) == 6
    fragment = (ROOT / 'screen.html').read_text()
    baseline = Page((ROOT / 'r0-current.html').read_text())
    gallery = Page((ROOT / 'comparison.html').read_text())
    assert len(gallery.frames) == 18
    assert {f['src'] for f in gallery.frames} == {d['slug'] + '.html' for d in current}
    assert len(gallery.ids) == len(set(gallery.ids))
    assert gallery.ids.index('round3') < gallery.ids.index('round2') < gallery.ids.index('round1')
    print('PASS: 18 gallery variants, round grouping, unique ids, preserved earlier data')
    spec = importlib.util.spec_from_file_location('r2math', ROOT / 'build-round2.py')
    math = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(math)
    assert math.ratio('#FFFFFF', '#000000') == 21
    assert math.ratio('#244CBC', '#244CBC') == 1
    # Fixed known reference, not a reimplementation of the production formula.
    assert abs(math.ratio('#777777', '#FFFFFF') - 4.478089453577214) < 1e-10
    assert math.ratio('#777777', '#FFFFFF') < 4.5
    references = {ROOT / 'comparison.html', ROOT / 'layout-check-round3.html'}
    for d in new:
        parent = next(p for p in old if p['id'] == d['parent'])
        assert d['parent'] in ('R2-1', 'R2-2', 'R2-4')
        assert d['tokens'] == parent['tokens'] and d['font_transfer_bytes'] == 0
        assert d['title_font'] and d['body_font'] and d['why'] and d['diff']
        assert all(d['platform_fallbacks'][os][role] for os in ('windows', 'iphone') for role in ('title', 'body'))
        text = (ROOT / (d['slug'] + '.html')).read_text()
        content_match(text, fragment)
        assert Page(text).tags == baseline.tags
        assert '<script' not in text.split('<body', 1)[1]
        assert len(d['contrast']['pairs']) == 20
        assert d['contrast']['pairs'] == math.measure(d)
        assert d['contrast']['pairs'] == parent['contrast']['pairs']
        assert all(p['meets_4_5'] for p in d['contrast']['pairs'])
        assert all(p['ratio'] >= 4.5 for p in d['contrast']['pairs'])
        references.add(ROOT / (d['slug'] + '.html'))
    print(f'PASS: six copied pages, identical fragment and {len(baseline.tags)} body elements; 120 contrast pairs')
    # Checks must reject altered content and unexpected external requests.
    for fn in (lambda: content_match(fragment.replace('拍拍手', '其他課'), fragment),
               lambda: local_target(ROOT / 'comparison.html', 'https://example.invalid/font.css'),
               lambda: local_target(ROOT / 'comparison.html', 'missing-round3-resource.css')):
        try:
            fn()
        except AssertionError:
            continue
        raise AssertionError('Negative fixture was not rejected')
    print('PASS: validator rejects changed content, external resource, and missing reference')
    seen = set()
    while references - seen:
        path = sorted(references - seen)[0]
        seen.add(path)
        if path.suffix == '.html':
            page = Page(path.read_text())
            assert len(page.ids) == len(set(page.ids)), path
            references.update(local_target(path, ref) for ref in page.refs)
    for name in ('typography-round3.css', 'typography-round3.js', 'comparison-round3.css', 'comparison-round3.js'):
        text = (ROOT / name).read_text()
        assert '@import' not in text and 'https://' not in text and 'http://' not in text
        assert 'url(' not in text and 'localStorage' not in text and 'fetch(' not in text
        seen.add(ROOT / name)
    print(f'PASS: {len(seen)} reachable local resources; no added webfont/network/storage references')
    if '--serve-check' in sys.argv:
        for path in sorted(seen):
            relative = path.relative_to(ROOT).as_posix()
            with urlopen('http://127.0.0.1:8765/design-exploration/' + relative, timeout=5) as response:
                assert response.status == 200 and response.read() == path.read_bytes(), relative
        print(f'PASS: HTTP 200 and byte equality for {len(seen)} resources')
    print('NOT MEASURED: browser geometry, typography rendering, screenshots, Windows Chrome, iPhone Safari')


if __name__ == '__main__':
    verify()
