# Phase 2 verification — 2026-11-12

The implementation uses the approved warm-paper / ink-teal palette. This is a
source and numerical verification report, **not a rendered-browser acceptance
report**.

Comparison base: `c36b4077b1ff8ac0938896f357babc31ff12349a`.
Starting HEAD: `1b3a0136f9f2bdd5e00cc11e5bd00fe068a95db8`; its only difference
from that base was the harness-committed `docs/ux-color/PALETTE.md`.

| Acceptance item | Status | Actual evidence |
| --- | --- | --- |
| One palette across six pages | **done (source implementation)** | All six pages link `tokens.css`; home and tool styles consume the same 20 tokens. Exam paper and protected JS literals are deliberate exclusions. |
| AA text / component boundaries / visible focus | **partial** | 48 token-pair calculations pass their 4.5:1 text or 3:1 UI threshold; opacity and gradient checks below also pass. Browser cascade/focus visibility is unobserved, and protected JS exceptions remain. |
| Print unchanged | **partial** | All pre-existing CSS bytes, `exam.css`, JS and HTML print styles are preserved; additions only apply to screen. No PDF or print raster comparison was possible. |
| Layout unchanged at 390 and 1280 | **partial** | Only color declarations/aliases were added; all original layout declarations and HTML bytes except the six link lines are unchanged. No element bounding boxes were measured. |

## Source checks actually run

- `git diff --check` passed.
- Python standard-library assertions compared each modified CSS file against
  `git show <base>:<file>`: **the entire original byte sequence is an unchanged
  prefix** in `styles.css`, `learning.css`, `vocabulary.css`,
  `stroke-notice.css`, and `attribution.css`. The last two originally lacked a
  final newline; the added screen blocks account for that diff presentation.
- Removing exactly one
  `<link rel="stylesheet" href="tokens.css" media="screen">` line from each
  of `index.html`, `learning.html`, `vocabulary.html`, `exam.html`, `backup.html`
  and `sync.html` reproduced its base bytes exactly.
- A terminal Python scanner checked **107 new rules / 216 declarations** across
  the appended CSS and `tokens.css`. Every top-level addition is `@media screen`;
  declarations are color properties or color custom properties. No new
  worksheet/exam-paper selectors or geometry declarations occur. All UI token
  references resolve; all 20 palette token values match the proposal. This
  scanner is not a browser CSS parser or computed-style measurement.
- All **13** new shadow declarations retain an existing offset/blur/spread
  shape. All **3** gradient declarations retain their existing direction and
  stops. Geometry was compared after removing color values from the original
  local CSS / HTML and the actual Bootstrap 5.3.0 stylesheet. Shadow colors
  changed, and focus-shadow alpha intentionally became opaque. Existing
  ordinary decorative shadow alphas remain unchanged. Disabled buttons keep
  their original absence of shadow.
- The tracked-change allowlist was checked against the base. `exam.css`, all
  JS/MJS, tests, fonts, data and protected directories are unchanged.
- Source inspection confirmed the screen PDF export calls
  `html2canvas(page, ...)` for each `.sheet-page`. New inherited color aliases
  avoid those paper elements and their ancestors; the exam aliases likewise
  avoid `#examPages` and its ancestors. This reduces risk but does not establish
  pixel identity for the canvas exporter.

The HTML/CSS isolation assertions can be reproduced without extra packages:

```sh
python3 -B - <<'PY'
from pathlib import Path
import subprocess
base = 'c36b4077b1ff8ac0938896f357babc31ff12349a'
for f in ['styles.css', 'learning.css', 'vocabulary.css',
          'stroke-notice.css', 'attribution.css']:
    old = subprocess.check_output(['git', 'show', f'{base}:{f}'])
    assert Path(f).read_bytes().startswith(old), f
link = b'    <link rel="stylesheet" href="tokens.css" media="screen">\n'
for f in ['index.html', 'learning.html', 'vocabulary.html',
          'exam.html', 'backup.html', 'sync.html']:
    old = subprocess.check_output(['git', 'show', f'{base}:{f}'])
    current = Path(f).read_bytes()
    assert current.count(link) == 1, f
    assert current.replace(link, b'') == old, f
print('Original CSS and one-line HTML checks passed')
PY
```

## Contrast checks actually run

Python sRGB relative-luminance calculations used the function definitions in
`PALETTE.md`, reading the implemented token values from `tokens.css`. Alpha is
composited in sRGB before calculating luminance. Decisions used unrounded
ratios. Independent sanity cases: black/white **21:1**, identical colors
**1:1**, `#777` on white **fails** 4.5:1, `#767676` on white **passes**.

| Implemented pairing | Calculated result |
| --- | --- |
| Seven text roles across white, canvas, muted surface and soft teal (28 pairs) | All ≥4.5:1; minimum **5.41:1** (muted text / soft teal). |
| Five boundary/focus roles across those four surfaces (20 pairs) | All ≥3:1; minimum **3.36:1** (border / soft teal). |
| White / primary, hover, active | **7.54 / 10.06 / 12.44:1**. |
| Brown focus / four light surfaces | **6.75 / 6.19 / 5.97 / 5.74:1**. These are separated outer outlines; brown directly against teal is not claimed as a passing pair. |
| Strong ink at `.6` opacity / four light surfaces | **4.91 / 4.78 / 4.72 / 4.65:1**; compensates loading/reset text. Reset's focus uses the same compensation. |
| Success subtitle ink at `.8` / white | **6.78:1**. |
| Warning text and border / warning surface | **6.06:1**. |
| Notice highlight, including `.95` parent opacity | **5.77 / 7.45:1** at the two gradient ends. Channels darken monotonically between them. |
| White / print-action ink | **12.74:1**. |

Low-contrast decorative dividers are not counted as functional boundaries.
Disabled fieldsets/buttons retain their existing opacity; their effective
colors are not represented as passing active-control colors. Protected JS
failures and unobserved native-focus behavior are listed in `OUT_OF_SCOPE.md`.

## Runtime attempts and unavailable checks

- `python3 -B scripts/preview.py` started successfully at
  `http://127.0.0.1:8765/`. Standard-library HTTP requests for all six pages and
  `tokens.css` returned **200**, the expected HTML/CSS MIME types, and bytes
  identical to the current files. This proves serving, not JS execution.
- `node`, `nodejs`, and `npm` are absent from PATH.
  `node --test tests/*.test.mjs` was attempted and exited **127** with
  `zsh:1: command not found: node`. **0 of the required 29 tests ran**; none is
  claimed as passing. No Node or npm dependency was installed.
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` exists.
  A subprocess with `--headless=new --no-first-run --no-default-browser-check
  --disable-gpu --user-data-dir=<repo>/artifacts/ux-color/chrome-profile
  --dump-dom about:blank` exited **-6**, with empty stdout/stderr. It produced
  no DOM/screenshot/PDF, and the task profile directory was not created.
- Computer-use inventory reported **“The browser access host is unavailable”**.
  The native Chrome fallback was rejected with **“Computer Use was not approved
  to use Google Chrome”**. No approval bypass or browser security change was
  attempted.
- Therefore no rendered 390px/1280px inspection, computed-style measurement,
  hover/active/error-state inspection, keyboard traversal, bounding-box
  comparison, custom-text/curriculum worksheet generation, exam/answer output
  comparison, A4 PDF raster comparison or cropping check was performed.
- **iPhone/iOS Safari, Windows Chrome and physical print were not tested.**
  A later harness should run the 29 tests, compare every element at both widths
  against the base, and compare custom-text, curriculum, exam and answer PDFs.

## Skill evidence and effect on the palette

Used the installed `.agents/skills/ui-ux-pro-max` supplied by the experiment.
The supplied pin was `nextlevelbuilder/ui-ux-pro-max-skill@6ae86f61f520d6ca229d2f40e070410638c908c5`;
the remote commit was not independently re-verified.

Actual terminal searches (all `python3 -B`, no `--persist`):

```sh
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "education family learning" --domain color
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "color-accessible-pairs" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "color-semantic" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "color-not-only" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "semantic color tokens" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "foreground background contrast" --domain ux
```

Actually read `SKILL.md` (especially Accessibility, Typography & Color and
Query Contract), `references/quick-reference.md` color/contrast entries in
sections 1 and 6, and `data/colors.csv` rows 9, 43, 78, 152 and 179. The UX
queries returned entries from `data/ux-guidelines.csv`; that file was consumed
through the search results rather than read in full. `search.py` was executed,
not modified. No skill-generated file was saved in the repository.

The palette search returned LMS, Family Calendar & Chores, and Kids Learning.
LMS's teal direction supported the proposal, but its `#0D9488` primary assumes
black text. Existing white button text requires the deeper `#245D59`; the pale
LMS border also needs the stronger `#73847C`. Warm paper and muted teal surfaces
are the design judgment for an adult-facing educational tool, not a claim
about learning outcomes. The skill's contrast guidance led to explicit
foreground/background and opacity checks, including the reset-focus correction.
Color-not-only guidance retained all existing labels, check marks, underlines
and status text. The semantic queries did not return an exact semantic-token
entry, so the directly read `color-semantic` quick-reference entry supplied
that guidance. All 20 proposed token values were retained.

Rework count: **1 local correction pass; 0 palette-direction replacements**.
Skill cleanup remains blocked as documented in `OUT_OF_SCOPE.md`.
