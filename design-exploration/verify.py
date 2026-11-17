"""Static artifact checks only. Writes evidence solely inside design-exploration.

Run from any cwd: python3 -B design-exploration/verify.py
Optional HTTP check: append --http-root http://127.0.0.1:8766/
No browser, product tests, git operations or third-party packages are used.
"""
import argparse
import hashlib
import json
import os
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.request import urlopen

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EVIDENCE = HERE / 'evidence'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = []
        self.errors = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if tag == 'script':
            self.scripts.append(attrs.get('src'))
        if any(key.startswith('on') for key in attrs):
            self.errors.append('Inline event handler')
        for key in ('href', 'src'):
            if key in attrs:
                self.references.append(attrs[key])


def snapshot():
    result = {}
    for parent, dirs, files in os.walk(ROOT, followlinks=False):
        dirs[:] = [d for d in dirs if d not in {'.git', 'design-exploration'}
                   and not (Path(parent) / d).is_symlink()]
        for name in files:
            if name == '.git':
                continue
            path = Path(parent) / name
            relative = str(path.relative_to(ROOT))
            result[relative] = ({'symlink': os.readlink(path)} if path.is_symlink()
                                else hashlib.sha256(path.read_bytes()).hexdigest())
    return result


def luminance(color):
    components = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
              for c in components]
    return sum(a * b for a, b in zip(linear, (.2126, .7152, .0722)))


def contrast(first, second):
    low, high = sorted((luminance(first), luminance(second)))
    return (high + .05) / (low + .05)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--http-root')
    args = parser.parse_args()
    errors = []
    files = sorted(HERE.glob('*.html'))
    resources = set()
    references_checked = 0
    for path in files:
        page = Page()
        page.feed(path.read_text())
        errors.extend(f'{path.name}: {e}' for e in page.errors)
        if len(page.ids) != len(set(page.ids)):
            errors.append(f'{path.name}: duplicate IDs')
        for script in page.scripts:
            if script not in {'comparison.js', 'preview.js'}:
                errors.append(f'{path.name}: unexpected script {script}')
        for reference in page.references:
            references_checked += 1
            url = urlsplit(reference)
            if url.scheme or url.netloc or reference.startswith('/'):
                errors.append(f'{path.name}: non-relative reference {reference}')
                continue
            if url.path:
                target = (path.parent / url.path).resolve()
                if HERE not in target.parents or not target.is_file():
                    errors.append(f'{path.name}: missing/outside resource {reference}')
                else:
                    resources.add(target.relative_to(HERE).as_posix())
            elif url.fragment and url.fragment not in page.ids:
                errors.append(f'{path.name}: unknown fragment {reference}')

    bodies = [re.search(r'<body>(.*?)</body>', (HERE / f'{theme}.html').read_text(), re.S).group(1)
              for theme in ('ink', 'clay', 'plum')]
    bodies_identical = len(set(bodies)) == 1
    if not bodies_identical:
        errors.append('Preview bodies differ')

    css = (HERE / 'directions.css').read_text()
    properties = set(re.findall(r'(?:^|[;{])\s*([\w-]+)\s*:', css, re.M))
    permitted = {'color', 'background', 'border-color', 'box-shadow', 'outline-color'}
    non_paint = sorted(p for p in properties if not p.startswith('--') and p not in permitted)
    if non_paint:
        errors.append(f'Non-paint theme properties: {non_paint}')
    for path in HERE.glob('*.css'):
        if re.search(r'@import\b|url\s*\(', path.read_text()):
            errors.append(f'{path.name}: imported or URL asset')

    pairs = [('ink', 'page'), ('muted', 'page'), ('ink', 'surface'), ('muted', 'surface'),
             ('on-action', 'action'), ('on-action', 'practice'), ('muted', 'footer'),
             ('tint-ink', 'tint'), ('action', 'page'), ('action', 'surface')]
    color_results = {}
    for theme, declarations in re.findall(r'\[data-direction="(ink|clay|plum)"\]\s*\{(.*?)\}', css, re.S):
        tokens = dict(re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6})', declarations))
        rows = []
        for foreground, background in pairs:
            ratio = contrast(tokens[foreground], tokens[background])
            rows.append({'foreground': foreground, 'background': background,
                         'ratio': round(ratio, 2), 'passes_4_5': ratio >= 4.5})
            if ratio < 4.5:
                errors.append(f'{theme}: low contrast {foreground}/{background}')
        color_results[theme] = rows
    if set(color_results) != {'ink', 'clay', 'plum'}:
        errors.append('Not all three palettes measured')

    before = json.loads((EVIDENCE / 'source-before.json').read_text())
    after = snapshot()
    changed = sorted(k for k in before.keys() & after.keys() if before[k] != after[k])
    added = sorted(after.keys() - before.keys())
    deleted = sorted(before.keys() - after.keys())
    if changed or added or deleted:
        errors.append('Files outside design-exploration changed')

    http = 'NOT MEASURED in this invocation'
    if args.http_root:
        url = urlsplit(args.http_root)
        if url.scheme != 'http' or url.hostname not in {'127.0.0.1', 'localhost'}:
            raise ValueError('Only a loopback HTTP preview is accepted')
        http = []
        for name in sorted(resources | {path.name for path in files}):
            with urlopen(args.http_root.rstrip('/') + '/design-exploration/' + name, timeout=5) as response:
                body = response.read()
                http.append({'path': name, 'status': response.status,
                             'content_type': response.headers.get('Content-Type'), 'bytes': len(body)})
                if response.status != 200:
                    errors.append(f'HTTP failure: {name}')

    result = {
        'scope': 'Static exploration only; no product correctness claim',
        'status': 'PASS' if not errors else 'FAIL',
        'html_files': [p.name for p in files], 'relative_references_checked': references_checked,
        'three_preview_bodies_identical': bodies_identical,
        'theme_non_paint_properties': non_paint,
        'source_files_compared': len(before), 'outside_folder_modified': changed,
        'outside_folder_added': added, 'outside_folder_deleted': deleted,
        'hash_scope': 'In-workspace files; .git and symlink target contents excluded',
        'contrast_pairs_per_direction': len(pairs),
        'minimum_text_contrast': {key: min(r['ratio'] for r in rows) for key, rows in color_results.items()},
        'http': http,
        'browser_390px': 'NOT MEASURED', 'browser_1280px': 'NOT MEASURED',
        'javascript_runtime_and_keyboard': 'NOT MEASURED',
        'original_live_layout_pixel_equivalence': 'NOT MEASURED',
        'ios_safari': 'NOT MEASURED', 'print_pdf_and_protected_behaviors': 'NOT MEASURED; not executed or changed',
        'errors': errors,
    }
    (EVIDENCE / 'contrast.json').write_text(json.dumps(color_results, ensure_ascii=False, indent=2) + '\n')
    (EVIDENCE / 'checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: value for key, value in result.items() if key != 'http'}, ensure_ascii=False, indent=2))
    if isinstance(http, list):
        print(f'HTTP: {len(http)} local resources returned 200')
    raise SystemExit(bool(errors))


if __name__ == '__main__':
    main()
