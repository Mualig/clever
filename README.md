# Ganz schön clever

A browser version of the *Ganz schön clever* dice games by Wolfgang Warsch.
Play solo or pass one device around for 2–4 players. Four games are available:

- **Ganz schön clever** (*That's Pretty Clever*, 2018)
- **Doppelt so clever** (*Twice as Clever*, 2019)
- **Clever hoch Drei** (*Ganz schön clever 3* / *Clever Cubed*, 2020)
- **Clever 4Ever** (*Ganz schön clever 4*, 2022)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests (vitest)
npm run build    # type-check + production build in dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to GitHub Pages.
One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The workflow sets `BASE_PATH` to `/<repo>/` (or `/` for a `*.github.io` repo) so asset URLs resolve on Pages.

## Layout

- `src/game/engine.ts` – shared turn engine (`newGame`, `reduce(state, action)`): rolls, silver platter, passive picks,
  actions, rounds. No UI dependencies, seeded dice so games are reproducible.
- `src/game/variant.ts` – the interface a game must implement: sheet, legal placements, bonuses, actions, scoring.
- `src/game/sheet.ts`, `rules.ts`, `clever1.ts` – the base game's sheet data, rules and variant.
- `src/game/sheet2.ts`, `rules2.ts`, `clever2.ts` – Doppelt so clever.
- `src/game/sheet3.ts`, `rules3.ts`, `clever3.ts` – Clever hoch Drei.
- `src/game/sheet4.ts`, `rules4.ts`, `clever4.ts` – Clever 4Ever.
- `src/ui/` – React components: setup (game and player selection), dice tray, one sheet view per game, scoreboard.

The engine is a plain reducer over a serialisable state, so the same code can later run on a server for online play.

## Rules implemented

- Rounds: 6 (solo and 2 players), 5 (3 players), 4 (4 players). Round bonuses: re-roll, +1, re-roll, then X or 6 in
  round 4.
- Active player: up to three rolls, one die per roll; lower dice go to the silver platter. White die is wild; blue is
  always blue + white.
- Passive players pick one platter die each (or one of the active player's dice if no platter die fits).
- Re-roll (active player only) re-rolls all dice just thrown. +1 actions at the end of a turn take any of the six dice,
  each die once per turn.
- All sheet bonuses chain immediately; bonuses that need a decision (yellow/blue X, round 4 choice, black 6) ask the
  player.
- Foxes score the lowest area; ties are broken by the best single area. Solo mode alternates active and passive turns
  and shows the rating table.

Doppelt so clever adds: the silver area (the silver die marks its number in any coloured row; dice swept onto the
platter by the silver die may be marked as well, each in the row of its own colour, with the wild white die and the
silver die free to use any row; only dice with a lower value than the silver die count as swept, so the higher dice
left over after the third roll do not; column bonuses, rows score by count), the yellow lattice (circle first, cross second;
lines of circles give bonuses, only crosses score), blue sums that must not increase, green pairs scoring first − second
(die × multiplier), pink numbers whose bonus needs the printed minimum, "?" bonuses, the Return action (active player
only, before a roll: take a platter die back into the next roll), row-end bonuses on the action tracks and forfeited
rolls. Interpretation choices: several Return actions may be used before the same roll; a negative green total counts
as the lowest area for the foxes.

Clever hoch Drei adds: yellow rows bound to the die fields I–III (grey cells only from the platter), turquoise
multi-crosses for matching dice, the blue ±1 chain with 7 as reset and +4 for 2–4 / 10–12, brown left-to-right crossing
with skips, pink half-plus-bonus or multiplied points, "?" bonuses (choose any number), the "any number" action row (3,
4, 5, 6, ?, ?, ?), row-end bonuses on the action tracks, and forfeited rolls instead of taking an unusable die.

Clever 4Ever adds: three yellow rows filled left to right (ascending top row with bonuses, a minus row with bonuses,
a plus row; full columns score), the blue coordinate grid (blue die = row, white die = column; the second cross in a
row or on the ↘ diagonal gives the bonus, columns with two crosses and the ↙ diagonal score), the grey polyomino area
(a grey die crosses one whole part of connected same-shade cells whose size is at most the die number, starting from
one of the two red-framed parts and then always adjacent to a cross; full columns score, every cell of a shade gives a
fox), green fields with two triangles (both rows fill left to right, lower triangles give bonuses, complete fields
score the sum, doubled from field 4), the pink track (2/4 circled for +2/+4, a 3 writes another 3, 5/6 take the bonus
below, a 6 is circled for +3, score by last field), "?" bonuses (any number; blue: any free cell), the Polish silver
action (±1 per action on a die taken from the silver platter, also with +1 dice from the platter; choosing blue may
polish the white die when it lies on the platter and vice versa) and forfeited rolls. The action tracks hold 7 re-rolls
(pink "?" at the end), 9 polish actions and 7 +1 actions. Interpretation choices: the 3 written by a 3 does not trigger
another 3; only one die is polished per placement; a passive player may also polish the blue/white partner die when
both lie on the platter.
