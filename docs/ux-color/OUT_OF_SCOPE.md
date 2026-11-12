# Phase 2 scope boundaries

Non-color product improvements proposed or performed: **none**. No changes to
layout, spacing, sizes, typography, content, DOM structure, IDs/classes,
JavaScript, storage, curriculum, fonts, or deployment.

Changes beyond CSS and the single stylesheet link in each HTML page are only
the three requested reports under `docs/ux-color/`: `DEVIATIONS.md`,
`OUT_OF_SCOPE.md`, and `TEST_NOTES.md`. The harness's existing `PALETTE.md` was
read and left unchanged. No generated verification files or artifacts were
added. No commit, push, branch, checkout, or deployment command was run.

## Protected colors and limitations

| Source | Preserved behavior / limitation |
| --- | --- |
| `script.js:23` | LINE browser guide uses `#94A3B8` on white: **2.56:1**. Literal remains untouched, including by CSS overrides. |
| `script.js:281` | “明天再來” button keeps inline white background and `#EEE` border. Border/white is **1.16:1**. Its existing `var(--text-dark)` text follows the UI alias; the literal border does not. |
| `script.js:294` | Success-view decorative divider keeps `#EEE`. |
| `script.js:295`, `:309–310` | Debug button retains `.5` opacity when inactive and JS-assigned `red` / `inherit`. Even black at `.5` on white reaches only **3.98:1**; color alone cannot make this normal-size text meet 4.5:1. |
| `script.js:943`, `:959`, `:975`, `:993` | Worksheet stroke loading `#999`, no-data `#CCC`, SVG fill `#000000`, and rendering-failure `red` remain unchanged. |
| Existing JS `var(--primary-sage)` / `var(--text-dark)` references | They resolve to the new palette only inside screen UI scopes, with no JS edits. The generated print/download actions retain their original logic. |
| `styles.css` worksheet rules and all print blocks | Original bytes retained, including blue grids, pink strokes, tracing grays, paper texture, dimensions and print diagnostics. New tokens/overrides are screen-only. |
| `exam.css` and exam rendering | Entire file and rendering code unchanged. Root `--line: #D5DFD5` remains available to `.exam-page`; UI aliases are confined to the header, controls and status elements. Exam body text inheritance is unchanged. |
| HTML metadata and footer underline | Existing `theme-color` values and `text-decoration-color` remain unchanged. Each HTML change is exactly one new `<link>` line. |
| Native focus, disabled opacity and transitions | Existing geometry, opacity, animations and browser-native behavior are retained. Actual keyboard visibility, clipping, intermediate transition colors and native file/checkbox appearance could not be observed. Any fix requiring non-color changes remains out of this round. |

These existing exceptions mean **whole-site AA compliance is not claimed**.
Numeric checks for the implemented token pairs are in `TEST_NOTES.md`.

## Skill removal blocked by filesystem permissions

The explicitly requested removal of `.agents/skills/ui-ux-pro-max` was attempted
after the searches and file reads. `git ls-files .agents/skills/ui-ux-pro-max`
returned no tracked files. Python `shutil.rmtree` failed immediately with:

```text
PermissionError: [Errno 1] Operation not permitted: 'quick-reference.md'
```

The directory still contains the original **75 files** (75 before and after
the attempt). The environment marks `.agents` read-only; approval escalation
is unavailable. It was not staged or committed, and `.gitignore` was not
changed. A writer with permission to this directory must remove it before the
harness includes the final tree. This requested cleanup is **not complete**.
