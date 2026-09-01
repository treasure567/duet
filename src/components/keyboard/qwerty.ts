import { isBlackKey } from '../../music/notes';

export const WHITE_KEYS = [
  'z',
  'x',
  'c',
  'v',
  'b',
  'n',
  'm',
  'q',
  'w',
  'e',
  'r',
  't',
  'y',
  'u',
  'i',
  'o',
  'p',
];

export const BLACK_KEYS = ['s', 'd', 'g', 'h', 'j', '2', '3', '5', '6', '7', '9', '0'];

export const MAX_WHITE_KEYS = WHITE_KEYS.length;

export function buildQwertyMap(fromMidi: number, toMidi: number): Map<number, string> {
  const map = new Map<number, string>();
  let whiteIndex = 0;
  let blackIndex = 0;
  for (let midi = fromMidi; midi <= toMidi; midi += 1) {
    if (isBlackKey(midi)) {
      const label = BLACK_KEYS[blackIndex];
      blackIndex += 1;
      if (label) map.set(midi, label);
    } else {
      const label = WHITE_KEYS[whiteIndex];
      whiteIndex += 1;
      if (label) map.set(midi, label);
    }
  }
  return map;
}

export function invertQwertyMap(map: Map<number, string>): Map<string, number> {
  const inverted = new Map<string, number>();
  for (const [midi, key] of map) inverted.set(key, midi);
  return inverted;
}
