import { useEffect, useState } from 'react';
import { currentPlayer, newGame } from '../game/engine';
import type { GameState } from '../game/types';
import { Game } from './Game';
import { Setup } from './Setup';

const STORAGE_KEY = 'clever-game-v2';
const HISTORY_KEY = 'clever-history-v2';
const MAX_HISTORY = 60;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/** Restores `prev` and records in its log what was rolled back. */
function rollback(current: GameState, prev: GameState): GameState {
  const undone = current.log.slice(prev.log.length).map((e) => e.text);
  const player = Math.max(0, currentPlayer(prev));
  const text = undone.length ? `Rollback: undid "${undone.join('; ')}"` : 'Rollback: undid the previous action';
  return { ...prev, log: [...prev.log, { round: prev.round, player, text }] };
}

export function App() {
  const [saved, setSaved] = useState<GameState | null>(() => load<GameState>(STORAGE_KEY));
  const [savedHistory] = useState<GameState[]>(() => load<GameState[]>(HISTORY_KEY) ?? []);
  const [game, setGame] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);

  useEffect(() => {
    save(STORAGE_KEY, game);
    save(HISTORY_KEY, game ? history : null);
  }, [game, history]);

  if (!game) {
    return (
      <Setup
        canResume={saved !== null && saved.phase.kind !== 'gameOver'}
        onResume={() => {
          setHistory(savedHistory);
          setGame(saved);
        }}
        onStart={(mode, names) => {
          setHistory([]);
          setGame(newGame(names, mode));
        }}
      />
    );
  }
  return (
    <Game
      game={game}
      setGame={(next) => {
        setHistory((h) => [...h, game].slice(-MAX_HISTORY));
        setGame(next);
      }}
      canUndo={history.length > 0}
      onUndo={() => {
        const prev = history[history.length - 1];
        if (!prev) return;
        setHistory((h) => h.slice(0, -1));
        setGame(rollback(game, prev));
      }}
      onQuit={() => {
        setSaved(null);
        setHistory([]);
        setGame(null);
      }}
    />
  );
}
