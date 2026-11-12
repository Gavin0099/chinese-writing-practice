# Phase 2 deviations

The 20 token values in `PALETTE.md` are implemented unchanged. No layout,
typography, JavaScript, exam-paper, or print changes were made.

One role assignment differs from the proposal: the existing `#resetAppBtn`
focus outline and focus shadow use `--ui-text-strong` instead of `--ui-focus`.
The button has inline `opacity: 0.6`, which must remain unchanged. That opacity
also fades its outline and shadow. The proposed brown focus color would yield
only **2.79:1** against its white card after compositing; the strong ink token
yields **4.91:1**. The existing outline width/style/offset and Bootstrap
`.25rem` focus-shadow geometry are preserved. Other focus indicators use brown.

Implementation was revised in one local correction pass: compensate for this
focus opacity and limit recolored primary-button shadows to enabled buttons so
that the existing disabled `box-shadow: none` keeps winning. The palette
direction was not replaced.
