import { describe, expect, it } from 'vitest';
import { midiToFrequency, nameToMidi } from '../music/notes';
import { detectPitch } from './detect';
import { readingToMidi, samplesToNotes, type PitchSample } from './phrase';

function tone(frequency: number, sampleRate = 44100, length = 2048): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    buffer[i] =
      0.6 * Math.sin(2 * Math.PI * frequency * t) +
      0.2 * Math.sin(4 * Math.PI * frequency * t) +
      0.08 * Math.sin(6 * Math.PI * frequency * t);
  }
  return buffer;
}

describe('pitch detection', () => {
  it('finds the fundamental of a sung vowel across the vocal range', () => {
    for (const name of ['C3', 'E3', 'A3', 'C4', 'E4', 'A4', 'C5']) {
      const midi = nameToMidi(name)!;
      const reading = detectPitch(tone(midiToFrequency(midi)), 44100);
      expect(reading.frequency, name).toBeGreaterThan(0);
      const detected = readingToMidi(reading.frequency, reading.clarity);
      expect(detected, name).not.toBeNull();
      expect(Math.abs(detected! - midi), `${name} detected ${detected}`).toBeLessThan(0.4);
    }
  });

  it('reports silence rather than inventing a pitch', () => {
    const silence = new Float32Array(2048);
    const reading = detectPitch(silence, 44100);
    expect(reading.frequency).toBe(0);
    expect(readingToMidi(reading.frequency, reading.clarity)).toBeNull();
  });

  it('rejects low clarity readings', () => {
    expect(readingToMidi(440, 0.2)).toBeNull();
  });
});

describe('phrase segmentation', () => {
  const bpm = 120;

  function hold(midi: number | null, seconds: number, from: number): PitchSample[] {
    const samples: PitchSample[] = [];
    for (let t = 0; t < seconds; t += 0.02) {
      samples.push({ timeSeconds: from + t, midi });
    }
    return samples;
  }

  it('turns steady pitches into notes', () => {
    const samples = [
      ...hold(60, 0.4, 0),
      ...hold(null, 0.1, 0.4),
      ...hold(64, 0.4, 0.5),
      ...hold(null, 0.1, 0.9),
      ...hold(67, 0.5, 1.0),
    ];
    const notes = samplesToNotes(samples, bpm);
    expect(notes.map((note) => note.midi)).toEqual([60, 64, 67]);
    expect(notes[0].startBeat).toBe(0);
    expect(notes[1].startBeat).toBeGreaterThan(0);
  });

  it('splits on a pitch jump without silence', () => {
    const samples = [...hold(60, 0.3, 0), ...hold(65, 0.3, 0.3)];
    expect(samplesToNotes(samples, bpm).map((n) => n.midi)).toEqual([60, 65]);
  });

  it('tolerates small wobble within one note', () => {
    const samples: PitchSample[] = [];
    for (let t = 0; t < 0.4; t += 0.02) {
      samples.push({ timeSeconds: t, midi: 60 + Math.sin(t * 30) * 0.4 });
    }
    expect(samplesToNotes(samples, bpm)).toHaveLength(1);
  });

  it('drops blips shorter than a grace note', () => {
    const samples = [...hold(60, 0.03, 0), ...hold(null, 0.1, 0.03)];
    expect(samplesToNotes(samples, bpm)).toHaveLength(0);
  });

  it('returns nothing for pure silence', () => {
    expect(samplesToNotes(hold(null, 1, 0), bpm)).toHaveLength(0);
  });
});
