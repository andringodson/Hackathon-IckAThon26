@AGENTS.md

## Working rules for this repo

- **Ponytail is always on** (`.claude/skills/ponytail`): smallest complete change, never cut validation, security, accessibility or error handling, and leave one test for non-trivial logic. Run `/ponytail-review` before pushing larger changes.
- **UI and motion follow Emil Kowalski's design engineering rules** (github.com/emilkowalski/skills): press feedback at scale 0.97, enter with opacity + 8px lift, ease-out under 300ms, no animation on actions repeated many times a day, honour Reduce Motion.
- **Replies use caveman style** (`.claude/skills/caveman`). Code, commits and docs stay in plain full sentences.
- All colours come from `src/theme/tokens.ts`. Never hardcode a colour in a component.
- Dark mode is true black (`#000000`) for OLED screens.
- Every change is committed and pushed to `main`.
