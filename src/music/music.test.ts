import { describe, expect, it } from 'vitest';
import { LIBRARY, libraryPiece } from '../data/library';
import { isBlackKey, midiToName, nameToMidi, parseNote, midiToFrequency } from './notes';
import { pieceDurationBeats, pieceRange, sortNotes } from './piece';
import { filterHands, simplifyPiece, sliceBars, transposePiece, scaleTempo } from './transforms';

describe('note naming', () => {
  it('round trips names and midi numbers', () => {
    for (let midi = 21; midi <= 108; midi += 1) {
      expect(nameToMidi(midiToName(midi))).toBe(midi);
    }
  });

  it('knows the anchors', () => {
    expect(nameToMidi('A4')).toBe(69);
    expect(nameToMidi('C4')).toBe(60);
    expect(midiToName(60)).toBe('C4');
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
  });

  it('accepts flats and sharps', () => {
    expect(nameToMidi('Bb3')).toBe(nameToMidi('A#3'));
    expect(nameToMidi('Db5')).toBe(nameToMidi('C#5'));
  });

  it('rejects nonsense', () => {
    expect(nameToMidi('H4')).toBeNull();
    expect(nameToMidi('')).toBeNull();
    expect(parseNote('quaver')).toBeNull();
    expect(parseNote(200)).toBeNull();
  });

  it('parses numeric and named input', () => {
    expect(parseNote(60)).toBe(60);
    expect(parseNote('60')).toBe(60);
    expect(parseNote('C4')).toBe(60);
  });

  it('identifies black keys', () => {
    expect(isBlackKey(nameToMidi('C#4')!)).toBe(true);
    expect(isBlackKey(nameToMidi('C4')!)).toBe(false);
  });
});

describe('library', () => {
  it('every piece is playable and in range', () => {
    for (const piece of LIBRARY) {
      expect(piece.notes.length, piece.id).toBeGreaterThan(4);
      expect(piece.bpm).toBeGreaterThan(20);
      const range = pieceRange(piece)!;
      expect(range.low, piece.id).toBeGreaterThanOrEqual(21);
      expect(range.high, piece.id).toBeLessThanOrEqual(108);
      for (const note of piece.notes) {
        expect(note.durationBeats, piece.id).toBeGreaterThan(0);
        expect(note.startBeat).toBeGreaterThanOrEqual(0);
        expect(note.velocity).toBeGreaterThan(0);
        expect(note.velocity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('notes are sorted by time', () => {
    for (const piece of LIBRARY) {
      const sorted = sortNotes(piece.notes);
      expect(sorted.map((n) => n.startBeat)).toEqual(piece.notes.map((n) => n.startBeat));
    }
  });

  it('looks pieces up by id', () => {
    expect(libraryPiece('fur-elise')?.composer).toBe('Beethoven');
    expect(libraryPiece('nope')).toBeUndefined();
  });
});

describe('transforms', () => {
  const piece = libraryPiece('ode-to-joy')!;

  it('transposes every note by the same interval', () => {
    const up = transposePiece(piece, 5);
    expect(up.notes).toHaveLength(piece.notes.length);
    up.notes.forEach((note, index) => {
      expect(note.midi).toBe(piece.notes[index].midi + 5);
    });
  });

  it('clamps transposition into the keyboard range', () => {
    const extreme = transposePiece(piece, 60);
    for (const note of extreme.notes) expect(note.midi).toBeLessThanOrEqual(108);
  });

  it('filters to one hand', () => {
    const right = filterHands(piece, ['right']);
    expect(right.notes.every((note) => note.hand === 'right')).toBe(true);
    expect(right.notes.length).toBeLessThan(piece.notes.length);
  });

  it('keeps both hands when asked for both', () => {
    expect(filterHands(piece, ['left', 'right']).notes).toHaveLength(piece.notes.length);
  });

  it('scales tempo within sane bounds', () => {
    expect(scaleTempo(piece, 0.5).bpm).toBe(48);
    expect(scaleTempo(piece, 100).bpm).toBe(240);
    expect(scaleTempo(piece, 0.0001).bpm).toBe(20);
  });

  it('keeps a tempo percentage exact on the round trip', () => {
    for (const factor of [0.5, 0.6, 0.7, 0.8, 0.9]) {
      const scaled = scaleTempo(piece, factor);
      expect(Math.round((scaled.bpm / piece.bpm) * 100)).toBe(Math.round(factor * 100));
    }
  });

  it('simplify keeps at most one note per hand per onset', () => {
    const simple = simplifyPiece(piece);
    const byStart = new Map<string, number>();
    for (const note of simple.notes) {
      const key = `${note.startBeat}:${note.hand}`;
      byStart.set(key, (byStart.get(key) ?? 0) + 1);
    }
    for (const count of byStart.values()) expect(count).toBe(1);
    expect(simple.notes.length).toBeLessThanOrEqual(piece.notes.length);
  });

  it('slices bars and rebases the timeline to zero', () => {
    const bars = sliceBars(piece, 1, 2);
    expect(bars.notes.length).toBeGreaterThan(0);
    expect(Math.min(...bars.notes.map((note) => note.startBeat))).toBe(0);
    expect(pieceDurationBeats(bars)).toBeLessThanOrEqual(piece.beatsPerBar * 2 + 1);
  });
});
