# Ganz schön clever

A browser version of the *Ganz schön clever* dice games by Wolfgang Warsch.
Play solo or pass one device around for 2–4 players. Two games are available:

- **Ganz schön clever** (*That's Pretty Clever*, 2018)
- **Clever hoch Drei** (*Ganz schön clever 3* / *Clever Cubed*, 2020)

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

- `src/game/engine.ts` – shared turn engine (`newGame`, `reduce(state, action)`): rolls, silver platter, passive picks, actions, rounds. No UI dependencies, seeded dice so games are reproducible.
- `src/game/variant.ts` – the interface a game must implement: sheet, legal placements, bonuses, actions, scoring.
- `src/game/sheet.ts`, `rules.ts`, `clever1.ts` – the base game's sheet data, rules and variant.
- `src/game/sheet3.ts`, `rules3.ts`, `clever3.ts` – Clever hoch Drei.
- `src/ui/` – React components: setup (game and player selection), dice tray, one sheet view per game, scoreboard.

The engine is a plain reducer over a serialisable state, so the same code can later run on a server for online play.

## Rules implemented

- Rounds: 6 (solo and 2 players), 5 (3 players), 4 (4 players). Round bonuses: re-roll, +1, re-roll, then X or 6 in round 4.
- Active player: up to three rolls, one die per roll; lower dice go to the silver platter. White die is wild; blue is always blue + white.
- Passive players pick one platter die each (or one of the active player's dice if no platter die fits).
- Re-roll (active player only) re-rolls all dice just thrown. +1 actions at the end of a turn take any of the six dice, each die once per turn.
- All sheet bonuses chain immediately; bonuses that need a decision (yellow/blue X, round 4 choice, black 6) ask the player.
- Foxes score the lowest area; ties are broken by the best single area. Solo mode alternates active and passive turns and shows the rating table.

Clever hoch Drei adds: yellow rows bound to the die fields I–III (grey cells only from the platter), turquoise multi-crosses for matching dice, the blue ±1 chain with 7 as reset and +4 for 2–4 / 10–12, brown left-to-right crossing with skips, pink half-plus-bonus or multiplied points, "?" bonuses (choose any number), the "any number" action row (3, 4, 5, 6, ?, ?, ?), row-end bonuses on the action tracks, and forfeited rolls instead of taking an unusable die.
