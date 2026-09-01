export type Hand = 'left' | 'right';

export interface Note {
  midi: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
  hand: Hand;
}

export interface Piece {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  beatsPerBar: number;
  notes: Note[];
  source: 'library' | 'agent' | 'midi-file' | 'improvised';
  note?: string;
}

export function pieceDurationBeats(piece: Piece): number {
  return piece.notes.reduce(
    (max, note) => Math.max(max, note.startBeat + note.durationBeats),
    0,
  );
}

export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

export function pieceDurationSeconds(piece: Piece): number {
  return beatsToSeconds(pieceDurationBeats(piece), piece.bpm);
}

export function pieceRange(piece: Piece): { low: number; high: number } | null {
  if (piece.notes.length === 0) return null;
  return {
    low: Math.min(...piece.notes.map((note) => note.midi)),
    high: Math.max(...piece.notes.map((note) => note.midi)),
  };
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
}
