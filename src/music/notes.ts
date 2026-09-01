export const NOTE_NAMES_SHARP = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  DB: 'C#',
  EB: 'D#',
  FB: 'E',
  GB: 'F#',
  AB: 'G#',
  BB: 'A#',
  CB: 'B',
};

export const MIN_MIDI = 21;
export const MAX_MIDI = 108;

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES_SHARP[((midi % 12) + 12) % 12]}${octave}`;
}

export function nameToMidi(name: string): number | null {
  const match = /^([A-Ga-g])([#b]{0,2})(-?\d)$/.exec(name.trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const octave = Number(match[3]);

  let pitchClass = NOTE_NAMES_SHARP.indexOf(letter as (typeof NOTE_NAMES_SHARP)[number]);
  if (pitchClass === -1) {
    const normalised = FLAT_TO_SHARP[`${letter}${accidental.toUpperCase()}`];
    if (!normalised) return null;
    pitchClass = NOTE_NAMES_SHARP.indexOf(normalised as (typeof NOTE_NAMES_SHARP)[number]);
    const midi = (octave + 1) * 12 + pitchClass;
    return Number.isFinite(midi) ? midi : null;
  }

  for (const character of accidental) {
    if (character === '#') pitchClass += 1;
    if (character === 'b') pitchClass -= 1;
  }

  const midi = (octave + 1) * 12 + pitchClass;
  return midi >= 0 && midi <= 127 ? midi : null;
}

export function parseNote(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 127 ? value : null;
  }
  const asNumber = Number(value);
  if (Number.isInteger(asNumber) && String(asNumber) === value.trim()) {
    return asNumber >= 0 && asNumber <= 127 ? asNumber : null;
  }
  return nameToMidi(value);
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function whiteKeyIndex(midi: number): number {
  const whitePattern = [0, 2, 4, 5, 7, 9, 11];
  const octave = Math.floor(midi / 12);
  const pitchClass = ((midi % 12) + 12) % 12;
  const within = whitePattern.filter((entry) => entry <= pitchClass).length - 1;
  return octave * 7 + Math.max(0, within);
}

export function countWhiteKeys(fromMidi: number, toMidi: number): number {
  let count = 0;
  for (let midi = fromMidi; midi <= toMidi; midi += 1) if (!isBlackKey(midi)) count += 1;
  return count;
}
