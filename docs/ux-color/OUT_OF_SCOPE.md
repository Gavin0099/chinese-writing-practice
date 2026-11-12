# Phase 2 scope exclusions

No non-color product changes were made or proposed. Layout, spacing, sizes, fonts, font weight, border/outline geometry, animation, copy, DOM structure, behavior, storage and data remain unchanged. No focus-ring geometry was added. Existing native focus treatment on dynamically created hero controls and footer links still needs browser verification; a geometry fix, if needed, belongs to another round.

## Files beyond CSS and the permitted HTML links

Only these requested documentation files were created:

- `docs/ux-color/DEVIATIONS.md`
- `docs/ux-color/OUT_OF_SCOPE.md`
- `docs/ux-color/TEST_NOTES.md`

The harness's existing `PALETTE.md` was read and left unchanged. Temporary Chrome profiles were created under `docs/ux-color/` for the launch attempts and removed by the temporary-directory context manager. No artifacts are part of this delivery. No protected paths, JavaScript, tests, existing documentation, theme-color metadata or `.gitignore` were edited. No git commit/push/branch/checkout, deployment, installation, design linter, external agent skill, palette database or design-guideline package was used.

## Existing JavaScript colors and opacity left untouched

Locations refer to the unchanged `script.js` at base `c36b4077b1ff8ac0938896f357babc31ff12349a`.

| Location | Existing value / effect | Disposition |
| --- | --- | --- |
| Line 23, LINE guide note | Inline `#94a3b8` text on white: **2.56:1**. | Retained; known AA text gap and off-palette gray. No CSS `!important` workaround for this JS literal. |
| Line 281, “明天再來” button | Inline white background, `#eee` border; border/white **1.16:1**. | Retained; known weak UI boundary. Its existing `var(--text-dark)` text naturally uses the scoped alias. |
| Line 294, debug section divider | Inline `#eee` dashed border. | Retained; decorative divider. |
| Lines 295–310, debug control | Initial `.5` opacity, toggled `.5`/`1`; inline `red` or `inherit`. | Retained. At `.5`, even black on white reaches only **3.98:1**; literal red on white is **4.00:1**. A color-only change cannot repair the low-opacity small text. |
| Line 943, stroke loading | Inline `#999`, **2.85:1** on white. | Retained inside protected worksheet rendering. |
| Line 959, missing strokes | Inline `#ccc`, **1.61:1** on white. | Retained inside protected worksheet rendering. |
| Line 975, stroke SVG | Fixed `fill="#000000"`. | Retained; worksheet content. |
| Line 993, stroke rendering error | Inline `red`, **4.00:1** on white. | Retained; worksheet rendering. |
| Lines 265, 275, 284, 496 | Existing `var(--primary-sage)` / `var(--text-dark)` references. | JS strings unchanged; these resolve to the new colors only inside the home UI scopes. Inline colors continue to take precedence, including on hover. |
| Line 266, success subtitle | Inline `.8` opacity. | Unchanged; a CSS-only darker text token compensates, as documented in DEVIATIONS.md. |

The other five page entry modules and `stroke-notice.js` were searched for color/background/shadow/fill/stroke declarations; no comparable color literals were found. All JS/MJS files remain unchanged regardless.

## Protected output and other retained colors

- Practice sheet paper texture, grid blue, tracing pink/gray, black strokes, print/debug rules and all worksheet selectors are untouched, including their screen rendering.
- `exam.css`, exam/answer rendering and the original root `--line: #d5dfd5` are untouched. New aliases apply to the exam header/controls/error/status, never its main element or exam content subtree.
- Existing Bootstrap select arrow SVG `#343a40` remains; it has **11.51:1** contrast on white. No icon, image or font was replaced.
- Footer `text-decoration-color: #cbd5e1`, four existing theme-color metadata values and unused legacy styles remain as proposed. The underline tint was not among the allowed color properties in this experiment.
- Decorative dividers and shadows are not claimed as accessible control boundaries. Existing disabled and transition opacity remains unchanged; numerical solid-color contrast is not proof of a composited disabled or animating state.

The known JS text/border gaps and unavailable browser checks mean **whole-site WCAG AA is not claimed**.
