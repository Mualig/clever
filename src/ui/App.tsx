import { useEffect, useState } from 'react';
import { newGame } from '../game/engine';
import type { GameState } from '../game/types';
import { Game } from './Game';
import { Setup } from './Setup';

const STORAGE_KEY = 'clever-game-v1';

function loadSaved(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

export function App() {
  const [saved, setSaved] = useState<GameState | null>(loadSaved);
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => {
    try {
      if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [game]);

  if (!game) {
    return (
      <Setup
        canResume={saved !== null && saved.phase.kind !== 'gameOver'}
        onResume={() => setGame(saved)}
        onStart={(names) => setGame(newGame(names))}
      />
    );
  }
  return (
    <Game
      game={game}
      setGame={setGame}
      onQuit={() => {
        setSaved(null);
        setGame(null);
      }}
    />
  );
}
