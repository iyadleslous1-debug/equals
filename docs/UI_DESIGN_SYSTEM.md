# UI Design System — DZ Connect

Companion to `design-system/dz-connect/MASTER.md` (the enforceable source).
This file explains the _why_; MASTER.md states the _what_.

## Principles

1. **Tokens, never values.** Colors come from `tailwind.config.js`; numbers from
   `constants/theme.ts` (unit-tested in `__tests__/theme.test.ts`). A hardcoded
   hex or magic number in a screen is a bug.
2. **Dark-first.** The palette (`void`/`ink`/gold) is dark-only by decision D2.
   `userInterfaceStyle` stays `"dark"` until a light theme is deliberately built.
3. **Restrained, not flashy.** Conservative-market Algeria: gold accent signals
   trust, not casino energy. No gradients-for-decoration, no suggestive imagery.
4. **System fonts.** Arabic/Darja bios must render correctly offline — remote
   fonts are banned in MVP1.

## Token inventory

| Group       | Source                         | Contents                                                                                                                             |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Colors      | `tailwind.config.js`           | void, ink, elevated, primary/onPrimary, secondary, text, muted, faint, border, destructive/onDestructive, success, warning/onWarning |
| Spacing     | `constants/theme.ts` `SPACING` | 4–64 tiers, multiples of 4 (tested)                                                                                                  |
| Gutters     | `GUTTER` / `MAX_CONTENT_WIDTH` | 16 phone · 24 large · 640 cap                                                                                                        |
| Radius      | `RADIUS`                       | 12 inputs/buttons · 16 cards · 24 sheets · full avatars                                                                              |
| Elevation   | `ELEVATION`                    | card 2 · sheet 4 · modal 8, Android + iOS pairs                                                                                      |
| Animation   | `ANIMATION.duration`           | 150/200/300ms, subtle tier                                                                                                           |
| Icons/touch | `ICON_SIZE` / `HIT_SLOP`       | 20/24/32 · ≥44/48 targets, slop 10                                                                                                   |

## Changing the system

1. Change the token, not the screen. 2. Update the test if invariants move.
2. Update MASTER.md + this file in the same commit. 4. Note it in the PR —
   token changes re-verify every screen's contrast checklist.
