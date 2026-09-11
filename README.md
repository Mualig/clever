# Ganz schön clever

A browser version of the dice game *Ganz schön clever* (*That's Pretty Clever*) by Wolfgang Warsch.
Play solo or pass one device around for 2–4 players.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests (vitest)
npm run build    # type-check + production build in dist/
```

## Layout

- `src/game/sheet.ts` – static score-sheet data: grids, bonus positions, score tables, round-track bonuses.
- `src/game/rules.ts` – legal placements, marking, bonus chaining, end-game scoring.
- `src/game/engine.ts` – pure game state machine (`newGame`, `reduce(state, action)`), no UI dependencies, seeded dice so games are reproducible.
- `src/ui/` – React components: setup, dice tray, interactive sheet, scoreboard.

The engine is a plain reducer over a serialisable state, so the same code can later run on a server for online play.

## Rules implemented

- Rounds: 6 (solo and 2 players), 5 (3 players), 4 (4 players). Round bonuses: re-roll, +1, re-roll, then X or 6 in round 4.
- Active player: up to three rolls, one die per roll; lower dice go to the silver platter. White die is wild; blue is always blue + white.
- Passive players pick one platter die each (or one of the active player's dice if no platter die fits).
- Re-roll (active player only) re-rolls all dice just thrown. +1 actions at the end of a turn take any of the six dice, each die once per turn.
- All sheet bonuses chain immediately; bonuses that need a decision (yellow/blue X, round 4 choice, black 6) ask the player.
- Foxes score the lowest area; ties are broken by the best single area. Solo mode alternates active and passive turns and shows the rating table.
