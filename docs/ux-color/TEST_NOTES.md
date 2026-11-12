# Phase 2 verification notes — 2026-11-12

Implementation is applied; rendered acceptance is partial. All results below were observed in this phase. No screenshot, computed style, bounding box, PDF, physical print or Node test pass is claimed.

Base: `c36b4077b1ff8ac0938896f357babc31ff12349a`. Starting HEAD: `fac67f130d33a352801cc8f99aead4a0d3b8bbb1`; starting `git status --short` was empty. The pre-existing PALETTE.md is the harness's Phase 1 commit, not a Phase 2 edit.

## Acceptance status

| Requirement | Status | Evidence / limitation |
| --- | --- | --- |
| One palette across six pages | **Done in source** | All six load the same 22 tokens. Home and learning styles use scoped aliases and screen color rules; exam content is deliberately excluded. All six HTML responses and all six stylesheets returned HTTP 200 and matched local bytes. Visual acceptance is unavailable. |
| AA text / UI / focus | **Partial** | Calculated intended pairs pass; original focus geometry is retained and focus colors updated. Fixed JS exceptions remain. No computed-style or keyboard/native-control verification. |
| Print unchanged | **Partial** | Every original CSS byte, including print blocks, is preserved as a prefix; all additions are under `@media screen`. `exam.css` and rendering code match base. Actual A4/PDF raster pixels and page counts were not compared. |
| Layout unchanged | **Partial** | HTML minus the unique link matches base byte-for-byte. New declarations contain only color properties/custom properties; 21 shadow declarations match existing geometry. No 390/1280 rendered bbox comparison was possible. |
| Existing 29 Node tests | **Not run** | The requested command exited 127: `zsh:1: command not found: node`. Neither `node` nor `nodejs` was on PATH. No replacement runtime or dependencies were installed. |

## Source and scope checks actually run

- `git diff --check`: passed (no whitespace errors).
- `git diff --stat`, `git diff --numstat c36b4077b1ff8ac0938896f357babc31ff12349a`, `git status --short`: reviewed the changed-file boundary.
- Python standard-library assertions compared six HTML files with `git show <base>:<file>` after removing exactly one `tokens.css` link. All remaining bytes matched, including inline styles/scripts and metadata.
- The five existing edited CSS files each begin with their **complete original byte sequence**. The two files formerly lacking a trailing newline now have a newline before their appended block; no original byte was replaced.
- Every CSS addition, including tokens.css, is inside one `@media screen` block. A declaration allowlist accepted only color longhands, gradient/shadow colors and custom properties. No `background`/`border`/`outline` shorthand, dimensions, opacity, font, spacing or layout declarations were added.
- The source checker rejected an in-memory `padding: 1px` addition and an unguarded `.panel { color: red; }` addition. These negative cases did not edit any file.
- All 21 added shadow declarations, including color-valued shadow custom properties, have offset/blur/spread/inset/layer geometry present in the base CSS/inline footer or pinned Bootstrap CSS. Manual cascade review checked the disabled onboarding button retains its original `box-shadow: none`, and Bootstrap focus shadows are not replaced by default decorative shadows. This is source evidence, not computed-style evidence.
- The changed tracked paths against base contain only the permitted five CSS files, six HTML files and the existing Phase 1 PALETTE.md. `exam.css`, all JS/MJS, fonts, data, print rules and protected paths therefore match base. New files are tokens.css and the three requested notes.

The core byte checks can be repeated without a build or dependency installation:

```sh
python3 -B - <<'PY'
from pathlib import Path
import subprocess
base = 'c36b4077b1ff8ac0938896f357babc31ff12349a'
link = b'    <link rel="stylesheet" href="tokens.css" media="screen">\n'
for name in ('index.html', 'learning.html', 'vocabulary.html',
             'exam.html', 'backup.html', 'sync.html'):
    old = subprocess.check_output(['git', 'show', base + ':' + name])
    new = Path(name).read_bytes()
    assert new.count(link) == 1 and new.replace(link, b'') == old, name
for name in ('styles.css', 'learning.css', 'vocabulary.css',
             'stroke-notice.css', 'attribution.css'):
    old = subprocess.check_output(['git', 'show', base + ':' + name])
    assert Path(name).read_bytes().startswith(old), name
print('HTML and original CSS byte invariants pass')
PY
```

## Contrast calculations actually run

Python read the values from the implemented tokens.css. Calculation used sRGB linearization (`c/12.92` at `c <= .04045`, otherwise `((c+.055)/1.055)**2.4`), relative luminance weights `.2126/.7152/.0722` and `(Lighter + .05)/(Darker + .05)`. Alpha was composited in sRGB before calculating luminance. Assertions used unrounded numbers. No design linter or palette package was used.

Independent reference checks: black/white equals 21:1, identical colors equal 1:1; existing `#94a3b8` text and `#a8b7ad` border on white fail their respective 4.5/3 thresholds.

| Calculated combinations | Minimum / result |
| --- | ---: |
| 7 text colors × 6 proposed light surfaces, 42 pairs | **5.212846:1** |
| Border, focus, primary, primary-hover, success, warning, danger × those surfaces, 42 pairs | **3.132755:1** |
| UI border on white / paper / soft | **4.1068 / 3.7670 / 3.6597:1** |
| Focus on white / paper / soft | **3.8225 / 3.5062 / 3.4064:1** |
| Gold focus touching primary / primary-hover / text fill | **3.065895 / 3.736113 / 3.283489:1** |
| White on primary / primary-hover / text fill | **11.719473 / 14.281402 / 12.551233:1** |
| Opacity-ink at `.6` on white / paper / soft | **4.688109 / 4.557015 / 4.508984:1** |
| Success subtitle text at `.8` on white | **6.711060:1** |
| Notice gradient, white text at `.95` | **10.739621:1** |
| Notice highlight, including `.2` white background and parent `.95` opacity | **6.065767:1** |
| Muted text on footer paper → soft gradient | **5.668194:1** |

Gradients were sampled at 1,001 evenly spaced positions. The solid-color matrix includes the disabled background as a mathematical pairing only; it does not claim the browser's group-opacity disabled state has that contrast. Known unfixable-in-scope text/UI gaps are listed in OUT_OF_SCOPE.md. The success subtitle adjustment is in DEVIATIONS.md.

## Local preview and browser attempts actually run

Started `python3 -B scripts/preview.py`, serving `http://127.0.0.1:8765/`. Python `urllib.request.urlopen` fetched the six HTML pages plus tokens.css, styles.css, learning.css, vocabulary.css, stroke-notice.css and attribution.css: **12 HTTP 200 responses**, each byte-identical to its local file. This demonstrates delivery, not successful JS execution or visual rendering.

Read the site's existing pinned Bootstrap dependency for cascade verification, without saving it or installing anything:

- URL: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css`
- Bytes: **232,914**
- SHA-256: `7f1d37f0d90b6385354c2ac10e2bb91563c46bd7a266ed351222ebcac8496c2a`
- Confirmed its `.25rem` focus shadow geometry, button color variables, form controls, `.text-muted !important`, and `.bg-light !important` declarations. The scoped overrides account for its later load order. This was an existing site asset, not a design guideline or new library.

The browser tool returned **`The browser access host is unavailable`**. Direct Chrome attempts used `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, `--headless=new --disable-gpu --no-first-run --no-default-browser-check`, isolated temporary profiles under docs/ux-color, `--dump-dom`, and window sizes **390 × 844** and **1280 × 844**. Both exited **-6**, with **0 stdout bytes and empty stderr**. No page DOM, screenshot or computed style was produced. Temporary profiles were cleaned up. No sandbox bypass was attempted.

Requested test command: `node --test tests/*.test.mjs`. Result: **exit 127, node not found**. The existing 29 tests were neither edited nor reported as passed.

## Unverified behavior and remaining risk

- **Rendered layout at 390px/1280px:** no element bounding boxes or before/after screenshots. Run the harness on base/current with identical viewport, fonts, fixtures and animation state; any geometry mismatch must fail. Source checks substantially limit the change surface but are not a replacement for this measurement.
- **Keyboard focus and runtime states:** no tab traversal, focus clipping check, native checkbox/file-control check, hover/pressed/computed-style measurement, onboarding interaction, populated lookup/vocabulary results, backup restore state or cloud-state rendering. Verify with a working browser; no cloud login/upload was attempted.
- **Custom-text and curriculum practice sheets:** not generated in this environment. Compare base/current with the same custom text (e.g. 春夏秋冬) and existing authorized curriculum lesson; verify A4 page counts/cropping and rasterized PDF pixels. The stylesheet additions cannot match print media, but a runtime pixel result is still unverified.
- **Exam/answer sheets:** no fixed-seed populated exam or PDF was rendered. Compare the same local vocabulary, lesson range, count and seed on base/current. The original root `--line` and exam subtree remain unmodified to avoid inherited palette leakage.
- **iPhone/iOS Safari, Windows Chrome and physical print:** unavailable and not tested. Device print preview, font rendering and printer behavior remain open acceptance items.
- **Node tests:** rerun the existing 29-test command in an environment with Node. There is no test-pass claim from this machine.

No intentional print/layout change or new dependency was introduced. The material risk is unobserved browser/cascade/native-control behavior, plus the explicitly retained JS contrast gaps. Approach restarts: **0**; one in-place hover consolidation during review. No commit, push or deployment was performed.
