import { MAX_MIDI, MIN_MIDI } from './notes';
import type { Hand, Note, Piece } from './piece';
import { sortNotes } from './piece';

export function transposePiece(piece: Piece, semitones: number): Piece {
  if (semitones === 0) return piece;
  const notes = piece.notes.map((note) => ({
    ...note,
    midi: Math.min(MAX_MIDI, Math.max(MIN_MIDI, note.midi + semitones)),
  }));
  return { ...piece, notes };
}

export function filterHands(piece: Piece, hands: Hand[]): Piece {
  if (hands.length === 0 || hands.length === 2) return piece;
  return { ...piece, notes: piece.notes.filter((note) => hands.includes(note.hand)) };
}

function clampBpm(value: number): number {
  return Math.round(Math.min(240, Math.max(20, value)) * 10) / 10;
}

export function scaleTempo(piece: Piece, factor: number): Piece {
  return { ...piece, bpm: clampBpm(piece.bpm * factor) };
}

export function setTempo(piece: Piece, bpm: number): Piece {
  return { ...piece, bpm: clampBpm(bpm) };
}

export function simplifyPiece(piece: Piece): Piece {
  const byStart = new Map<number, Note[]>();
  for (const note of piece.notes) {
    const key = Math.round(note.startBeat * 1000) / 1000;
    if (!byStart.has(key)) byStart.set(key, []);
    byStart.get(key)!.push(note);
  }

  const notes: Note[] = [];
  for (const [, group] of byStart) {
    const right = group.filter((note) => note.hand === 'right');
    const left = group.filter((note) => note.hand === 'left');
    if (right.length > 0) {
      notes.push(right.reduce((top, note) => (note.midi > top.midi ? note : top)));
    }
    if (left.length > 0) {
      notes.push(left.reduce((low, note) => (note.midi < low.midi ? note : low)));
    }
  }

  return { ...piece, notes: sortNotes(notes) };
}

export function sliceBars(piece: Piece, fromBar: number, toBar: number): Piece {
  const startBeat = (fromBar - 1) * piece.beatsPerBar;
  const endBeat = toBar * piece.beatsPerBar;
  const notes = piece.notes
    .filter((note) => note.startBeat >= startBeat - 1e-6 && note.startBeat < endBeat - 1e-6)
    .map((note) => ({ ...note, startBeat: note.startBeat - startBeat }));
  return { ...piece, notes: sortNotes(notes) };
}
