import { MAX_MIDI, MIN_MIDI, isBlackKey } from '../../music/notes';
import type { Piece } from '../../music/piece';
import { MAX_WHITE_KEYS } from './qwerty';

export interface VisibleRange {
  from: number;
  to: number;
}

export function windowFromC(startC: number, whiteKeys = MAX_WHITE_KEYS): VisibleRange {
  let seen = 0;
  let midi = startC;
  let last = startC;
  while (midi <= MAX_MIDI && seen < whiteKeys) {
    if (!isBlackKey(midi)) {
      seen += 1;
      last = midi;
    }
    midi += 1;
  }
  return { from: startC, to: last };
}

export function rangeForPiece(piece: Piece): VisibleRange {
  if (piece.notes.length === 0) return windowFromC(48);

  let best = windowFromC(48);
  let bestScore = -1;

  for (let startC = 24; startC <= 84; startC += 12) {
    const candidate = windowFromC(startC);
    if (candidate.to > MAX_MIDI) break;
    const covered = piece.notes.filter(
      (note) => note.midi >= candidate.from && note.midi <= candidate.to,
    ).length;
    if (covered > bestScore) {
      bestScore = covered;
      best = candidate;
    }
  }

  return best;
}

export function shiftRange(range: VisibleRange, octaves: number): VisibleRange {
  const startC = range.from + octaves * 12;
  if (startC < MIN_MIDI || startC > 96) return range;
  const shifted = windowFromC(startC);
  return shifted.to > MAX_MIDI ? range : shifted;
}
