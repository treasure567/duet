import { frequencyToMidi } from '../music/notes';
import type { Note } from '../music/piece';
import { secondsToBeats } from '../music/piece';

export interface PitchSample {
  timeSeconds: number;
  midi: number | null;
}

const MIN_NOTE_SECONDS = 0.09;
const PITCH_TOLERANCE_SEMITONES = 0.85;

export function samplesToNotes(samples: PitchSample[], bpm: number): Note[] {
  const notes: Note[] = [];
  let currentPitches: number[] = [];
  let startTime = 0;
  let lastTime = 0;

  const flush = (endTime: number) => {
    if (currentPitches.length === 0) return;
    const sorted = [...currentPitches].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const duration = endTime - startTime;
    if (duration >= MIN_NOTE_SECONDS) {
      notes.push({
        midi: Math.round(median),
        startBeat: secondsToBeats(startTime, bpm),
        durationBeats: Math.max(0.125, secondsToBeats(duration, bpm)),
        velocity: 0.75,
        hand: 'right',
      });
    }
    currentPitches = [];
  };

  for (const sample of samples) {
    lastTime = sample.timeSeconds;
    if (sample.midi === null) {
      flush(sample.timeSeconds);
      continue;
    }
    if (currentPitches.length === 0) {
      startTime = sample.timeSeconds;
      currentPitches = [sample.midi];
      continue;
    }
    const reference = currentPitches[currentPitches.length - 1];
    if (Math.abs(sample.midi - reference) <= PITCH_TOLERANCE_SEMITONES) {
      currentPitches.push(sample.midi);
    } else {
      flush(sample.timeSeconds);
      startTime = sample.timeSeconds;
      currentPitches = [sample.midi];
    }
  }

  flush(lastTime);

  if (notes.length > 0) {
    const offset = notes[0].startBeat;
    for (const note of notes) note.startBeat -= offset;
  }

  return notes;
}

export function readingToMidi(frequency: number, clarity: number): number | null {
  if (frequency <= 0 || clarity < 0.55) return null;
  const midi = frequencyToMidi(frequency);
  if (midi < 36 || midi > 96) return null;
  return midi;
}
