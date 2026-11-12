# Phase 2 deviations from PALETTE.md

All 22 proposed `--ui-*` names and values are unchanged. The palette remains warm paper / deep teal. The new stylesheet is screen-only, and each HTML page has exactly the proposed one-line link addition. Existing theme-color metadata is unchanged.

1. **Success subtitle opacity compensation.** `script.js:266` gives `.success-state .hero-subtitle` an inline opacity of `.8`. The normal subtitle inherits the proposed muted color, but the success subtitle uses `--ui-text` instead. Muted at that opacity on white would be **3.997914:1**; text at the same opacity is **6.711060:1**. This changes only CSS color; the JavaScript and opacity stay intact. This supplements the proposal's explicit compensation for loading text and the reset button.
2. **Common hover rules live in learning.css.** The same secondary hover (`--ui-soft`) and primary hover (`--ui-primary-hover`) are applied to the five tool-page interfaces, including the exam controls. Previously only vocabulary/sync had explicit button hover fills. The existing white/primary backgrounds change color on hover; dimensions and behavior remain untouched. Vocabulary-specific selected/error/delete colors remain in vocabulary.css.

Implementation approach restarts: **0**. One in-place review refinement consolidated the tool hover colors. The subtitle adjustment was identified during initial implementation. No palette was discarded or substituted.
