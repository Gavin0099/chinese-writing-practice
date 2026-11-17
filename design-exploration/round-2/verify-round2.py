"""Read-only artifact checks for Round 2. No product tests are run or changed.

python3 -B design-exploration/verify-round2.py [--serve-check]
Browser bounding boxes are a separate observation in layout-check.html.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('r1_verify', ROOT / 'round-1/verify.py')
original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(original)
spec = importlib.util.spec_from_file_location('r1_build', ROOT / 'round-1/build.py')
arithmetic = importlib.util.module_from_spec(spec)
spec.loader.exec_module(arithmetic)


def run(serve):
    frozen = json.loads((ROOT / 'round1-preservation.json').read_text())['files']
    changed_shared = {'README.md', 'QUESTIONS.md', 'SOURCE-NOTES.md', 'VALIDATION.md',
                      'directions.json', 'comparison.html'}
    for name, digest in frozen.items():
        assert hashlib.sha256((ROOT / 'round-1' / name).read_bytes()).hexdigest() == digest, name
        if name not in changed_shared:
            assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
    print(f'PASS: {len(frozen)} frozen Round 1 files match original SHA256; all R0/R1 pages and shared CSS untouched.')
    old = json.loads((ROOT / 'round-1/directions.json').read_text())
    all_directions = json.loads((ROOT / 'directions.json').read_text())
    assert all_directions[:7] == old and len(all_directions) == 12
    new = all_directions[7:]
    assert {d['id'] for d in new} == {f'R2-{i}' for i in range(1, 6)}
    fragment = (ROOT / 'screen.html').read_text()
    metric_keys = ('body-font', 'heading-font', 'label-font', 'heading-weight',
                   'entry-weight', 'label-weight', 'heading-tracking')
    css = (ROOT / 'themes-round2.css').read_text()
    for d in new:
        assert set(d['parents']) <= {'R1-1', 'R1-2', 'R1-3', 'R1-4'} and len(d['parents']) >= 2
        assert all(d['tokens'][k] == old[0]['tokens'][k] for k in metric_keys), d['id']
        page = (ROOT / (d['slug'] + '.html')).read_text()
        assert page.count(fragment) == 1
        assert 'href="screen.css"' in page and 'href="themes-round2.css"' in page
        body = re.search(r'body\.' + re.escape(d['slug']) + r'\s*\{([^}]+)\}', css).group(1)
        declarations = dict(re.findall(r'--([\w-]+):\s*([^;]+);', body))
        assert declarations == d['tokens'], d['id']
    # Color-only exceptions and the byte-identical study disclaimer are the only non-token rules.
    stripped = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    stripped = re.sub(r'body\.r2-[\w-]+\s*\{[^}]*\}', '', stripped)
    stripped = stripped[:stripped.index('.study-disclaimer {')]
    assert all(rule.strip() == 'color: var(--card-muted);' for rule in re.findall(r'\{([^}]+)\}', stripped))
    original_disclaimer = (ROOT / 'themes.css').read_text().split('.study-disclaimer {', 1)[1]
    assert css.split('.study-disclaimer {', 1)[1] == original_disclaimer
    print('PASS: 5 exact content copies; all 7 font/weight/tracking tokens equal R0; only color and paint differ.')

    resources = set()
    reference_count = 0
    # Deliberately do not traverse harness-shots/.
    pages = list(ROOT.glob('*.html')) + list((ROOT / 'round-1').glob('*.html'))
    for path in pages:
        parsed = original.Page()
        parsed.feed(path.read_text())
        assert len(parsed.ids) == len(set(parsed.ids)), path.name
        for tag, ref in parsed.refs:
            parts = urlsplit(ref)
            assert not parts.scheme and not parts.netloc and not ref.startswith('/'), (path, ref)
            target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
            assert target.is_relative_to(ROOT) and target.exists(), (path, ref)
            resources.add(target)
            reference_count += 1
            if parts.fragment and target.suffix == '.html':
                destination = original.Page()
                destination.feed(target.read_text())
                assert parts.fragment in destination.ids, ref
        if path.name.startswith(('r0-', 'r1-', 'r2-')):
            assert not parsed.scripts, path.name
    parsed = original.Page()
    parsed.feed((ROOT / 'comparison.html').read_text())
    assert len(parsed.frames) == 12
    assert {f['src'] for f in parsed.frames} == {d['slug'] + '.html' for d in all_directions}
    assert all(f.get('title') and f.get('sandbox') == 'allow-same-origin' for f in parsed.frames)
    assert parsed.ids.index('round2') < parsed.ids.index('round1')
    for path in ROOT.glob('*.css'):
        assert not re.search(r'@import|@font-face|url\s*\(', path.read_text()), path.name
    for name in ('comparison-round2.js', 'layout-check.js'):
        code = re.sub(r'/\*.*?\*/|//[^\n]*', '', (ROOT / name).read_text(), flags=re.S)
        assert not re.search(r'\b(fetch|localStorage|sessionStorage|XMLHttpRequest|supabase|print)\b', code), name
    print(f'PASS: {len(pages)} HTML files, {reference_count} relative references, 12 comparison frames; no external assets or product scripts.')

    contrasts = json.loads((ROOT / 'contrast-round2.json').read_text())['directions']
    assert abs(arithmetic.contrast('#000000', '#FFFFFF') - 21) < 1e-12
    assert arithmetic.contrast('#626262', '#626262') == 1
    for d in new:
        rows = contrasts[d['id']]
        assert len(rows) == 20 and rows == d['contrast']['pairs']
        for row in rows:
            actual = arithmetic.contrast(row['foreground'], row['background'][0])
            assert abs(actual - row['ratio']) <= .0005 and actual >= 4.5, (d['id'], row['pair'])
        assert d['contrast']['minimum'] == min(r['ratio'] for r in rows)
    print('PASS: 100 R2 text pairs agree with frozen Round 1 arithmetic; all >= 4.5:1 (not a browser audit).')
    if serve:
        resources.add(ROOT / 'comparison.html')
        resources.add(ROOT / 'layout-check.html')
        for target in resources:
            url = 'http://127.0.0.1:8765/design-exploration/' + target.relative_to(ROOT).as_posix()
            with urlopen(url) as response:
                assert response.status == 200 and response.read() == target.read_bytes(), target
        print(f'PASS: {len(resources)} linked resources served HTTP 200 and matched disk bytes.')
    print('Bounding boxes at 390/1280, screenshots, visual difference and iOS: NOT MEASURED by this command.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serve-check', action='store_true')
    run(parser.parse_args().serve_check)
