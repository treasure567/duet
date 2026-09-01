import { MAX_MIDI, MIN_MIDI, isBlackKey } from '../../music/notes';

export interface KeyLayout {
  midi: number;
  black: boolean;
  left: number;
  width: number;
}

export function buildKeyboardLayout(
  fromMidi = MIN_MIDI,
  toMidi = MAX_MIDI,
): { keys: KeyLayout[]; whiteCount: number } {
  const whiteMidis: number[] = [];
  for (let midi = fromMidi; midi <= toMidi; midi += 1) {
    if (!isBlackKey(midi)) whiteMidis.push(midi);
  }
  const whiteCount = whiteMidis.length;
  const whiteWidth = 100 / whiteCount;
  const blackWidth = whiteWidth * 0.58;

  const keys: KeyLayout[] = [];
  let whiteIndex = 0;

  for (let midi = fromMidi; midi <= toMidi; midi += 1) {
    if (!isBlackKey(midi)) {
      keys.push({ midi, black: false, left: whiteIndex * whiteWidth, width: whiteWidth });
      whiteIndex += 1;
    } else {
      const left = whiteIndex * whiteWidth - blackWidth / 2;
      keys.push({ midi, black: true, left, width: blackWidth });
    }
  }

  return { keys, whiteCount };
}
