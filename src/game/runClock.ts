import { RUN_DURATION_MS } from './constants.ts';

export function advanceRunClock(elapsedMs: number, deltaMs: number, durationMs = RUN_DURATION_MS): {
  elapsedMs: number;
  finished: boolean;
} {
  const next = elapsedMs + Math.max(0, deltaMs);
  return {
    elapsedMs: Math.min(next, durationMs),
    finished: next >= durationMs,
  };
}

export function formatRunClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
