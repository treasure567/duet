import { nameToMidi } from '../music/notes';
import type { Hand, Note, Piece } from '../music/piece';
import { sortNotes } from '../music/piece';

type Entry = [name: string, durationBeats: number, gapBeats?: number];

function line(hand: Hand, startBeat: number, entries: Entry[], velocity = 0.78): Note[] {
  const notes: Note[] = [];
  let cursor = startBeat;
  for (const [name, durationBeats, gapBeats = 0] of entries) {
    const midi = nameToMidi(name);
    if (midi !== null) {
      notes.push({ midi, startBeat: cursor, durationBeats, velocity, hand });
    }
    cursor += durationBeats + gapBeats;
  }
  return notes;
}

function chord(
  hand: Hand,
  startBeat: number,
  names: string[],
  durationBeats: number,
  velocity = 0.6,
): Note[] {
  return names
    .map((name) => nameToMidi(name))
    .filter((midi): midi is number => midi !== null)
    .map((midi) => ({ midi, startBeat, durationBeats, velocity, hand }));
}

function furElise(): Piece {
  const right: Note[] = [
    ...line('right', 0, [
      ['E5', 0.5],
      ['D#5', 0.5],
      ['E5', 0.5],
      ['D#5', 0.5],
      ['E5', 0.5],
      ['B4', 0.5],
      ['D5', 0.5],
      ['C5', 0.5],
      ['A4', 1.5],
    ]),
    ...line('right', 6, [
      ['C4', 0.5],
      ['E4', 0.5],
      ['A4', 0.5],
      ['B4', 1.5],
    ]),
    ...line('right', 9, [
      ['E4', 0.5],
      ['G#4', 0.5],
      ['B4', 0.5],
      ['C5', 1.5],
    ]),
    ...line('right', 12, [
      ['E4', 0.5],
      ['E5', 0.5],
      ['D#5', 0.5],
      ['E5', 0.5],
      ['D#5', 0.5],
      ['E5', 0.5],
      ['B4', 0.5],
      ['D5', 0.5],
      ['C5', 0.5],
      ['A4', 1.5],
    ]),
  ];

  const left: Note[] = [
    ...chord('left', 4.5, ['A2', 'E3'], 1.5, 0.5),
    ...chord('left', 7.5, ['E2', 'B2'], 1.5, 0.5),
    ...chord('left', 10.5, ['A2', 'E3'], 1.5, 0.5),
    ...chord('left', 16.5, ['A2', 'E3'], 1.5, 0.5),
  ];

  return {
    id: 'fur-elise',
    title: 'Für Elise (opening)',
    composer: 'Beethoven',
    bpm: 72,
    beatsPerBar: 3,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. The first phrase, in A minor.',
  };
}

function odeToJoy(): Piece {
  const right = [
    ...line('right', 0, [
      ['E4', 1],
      ['E4', 1],
      ['F4', 1],
      ['G4', 1],
      ['G4', 1],
      ['F4', 1],
      ['E4', 1],
      ['D4', 1],
      ['C4', 1],
      ['C4', 1],
      ['D4', 1],
      ['E4', 1],
      ['E4', 1.5],
      ['D4', 0.5],
      ['D4', 2],
    ]),
    ...line('right', 16, [
      ['E4', 1],
      ['E4', 1],
      ['F4', 1],
      ['G4', 1],
      ['G4', 1],
      ['F4', 1],
      ['E4', 1],
      ['D4', 1],
      ['C4', 1],
      ['C4', 1],
      ['D4', 1],
      ['E4', 1],
      ['D4', 1.5],
      ['C4', 0.5],
      ['C4', 2],
    ]),
  ];

  const left = [
    ...chord('left', 0, ['C3', 'E3'], 2),
    ...chord('left', 2, ['C3', 'F3'], 2),
    ...chord('left', 4, ['C3', 'E3'], 2),
    ...chord('left', 6, ['G2', 'D3'], 2),
    ...chord('left', 8, ['C3', 'E3'], 2),
    ...chord('left', 10, ['C3', 'E3'], 2),
    ...chord('left', 12, ['G2', 'B2'], 2),
    ...chord('left', 14, ['G2', 'D3'], 2),
    ...chord('left', 16, ['C3', 'E3'], 2),
    ...chord('left', 18, ['C3', 'F3'], 2),
    ...chord('left', 20, ['C3', 'E3'], 2),
    ...chord('left', 22, ['G2', 'D3'], 2),
    ...chord('left', 24, ['C3', 'E3'], 2),
    ...chord('left', 26, ['C3', 'E3'], 2),
    ...chord('left', 28, ['G2', 'B2'], 2),
    ...chord('left', 30, ['C3', 'G3'], 2),
  ];

  return {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    composer: 'Beethoven',
    bpm: 96,
    beatsPerBar: 4,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. Simple two-hand arrangement in C.',
  };
}

function twinkle(): Piece {
  const right = line('right', 0, [
    ['C4', 1],
    ['C4', 1],
    ['G4', 1],
    ['G4', 1],
    ['A4', 1],
    ['A4', 1],
    ['G4', 2],
    ['F4', 1],
    ['F4', 1],
    ['E4', 1],
    ['E4', 1],
    ['D4', 1],
    ['D4', 1],
    ['C4', 2],
  ]);

  const left = [
    ...chord('left', 0, ['C3', 'E3'], 2),
    ...chord('left', 2, ['C3', 'E3'], 2),
    ...chord('left', 4, ['F2', 'C3'], 2),
    ...chord('left', 6, ['C3', 'E3'], 2),
    ...chord('left', 8, ['F2', 'C3'], 2),
    ...chord('left', 10, ['C3', 'E3'], 2),
    ...chord('left', 12, ['G2', 'D3'], 2),
    ...chord('left', 14, ['C3', 'E3'], 2),
  ];

  return {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    composer: 'Traditional',
    bpm: 100,
    beatsPerBar: 4,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. A gentle first piece for practice mode.',
  };
}

function cMajorScale(): Piece {
  const up: Entry[] = [
    ['C4', 0.5],
    ['D4', 0.5],
    ['E4', 0.5],
    ['F4', 0.5],
    ['G4', 0.5],
    ['A4', 0.5],
    ['B4', 0.5],
    ['C5', 0.5],
  ];
  const down: Entry[] = [...up].reverse();
  return {
    id: 'c-major-scale',
    title: 'C major scale',
    composer: 'Exercise',
    bpm: 88,
    beatsPerBar: 4,
    notes: sortNotes([...line('right', 0, up), ...line('right', 4, down)]),
    source: 'library',
    note: 'Two octaves up and down, right hand.',
  };
}


function moonlight(): Piece {
  const arp = (start: number, names: string[]): Note[] => {
    const out: Note[] = [];
    for (let repeat = 0; repeat < 4; repeat += 1) {
      names.forEach((name, index) => {
        const midi = nameToMidi(name);
        if (midi === null) return;
        out.push({
          midi,
          startBeat: start + repeat + index / 3,
          durationBeats: 0.34,
          velocity: 0.6,
          hand: 'right',
        });
      });
    }
    return out;
  };

  return {
    id: 'moonlight',
    title: 'Moonlight Sonata (opening)',
    composer: 'Beethoven',
    bpm: 54,
    beatsPerBar: 4,
    notes: sortNotes([
      ...arp(0, ['G#3', 'C#4', 'E4']),
      ...arp(4, ['G#3', 'C#4', 'E4']),
      ...arp(8, ['A3', 'C#4', 'E4']),
      ...arp(12, ['G#3', 'B#3', 'F#4']),
      ...chord('left', 0, ['C#2', 'C#3'], 4, 0.5),
      ...chord('left', 4, ['B1', 'B2'], 4, 0.5),
      ...chord('left', 8, ['A1', 'A2'], 4, 0.5),
      ...chord('left', 12, ['G#1', 'G#2'], 4, 0.5),
    ]),
    source: 'library',
    note: 'Public domain. The rocking triplets that open the first movement.',
  };
}

function canonInD(): Piece {
  const melody = line('right', 0, [
    ['F#5', 2], ['E5', 2], ['D5', 2], ['C#5', 2],
    ['B4', 2], ['A4', 2], ['B4', 2], ['C#5', 2],
    ['D5', 2], ['C#5', 2], ['B4', 2], ['A4', 2],
    ['G4', 2], ['F#4', 2], ['G4', 2], ['E4', 2],
  ]);
  const bass = line('left', 0, [
    ['D3', 2], ['A2', 2], ['B2', 2], ['F#2', 2],
    ['G2', 2], ['D2', 2], ['G2', 2], ['A2', 2],
    ['D3', 2], ['A2', 2], ['B2', 2], ['F#2', 2],
    ['G2', 2], ['D2', 2], ['G2', 2], ['A2', 2],
  ], 0.55);
  return {
    id: 'canon-in-d',
    title: 'Canon in D',
    composer: 'Pachelbel',
    bpm: 64,
    beatsPerBar: 4,
    notes: sortNotes([...melody, ...bass]),
    source: 'library',
    note: 'Public domain. The famous ground bass with its first melody.',
  };
}

function preludeInC(): Piece {
  const figure = (start: number, names: string[], bass: string[]): Note[] => {
    const out: Note[] = [];
    for (let half = 0; half < 2; half += 1) {
      names.forEach((name, index) => {
        const midi = nameToMidi(name);
        if (midi === null) return;
        out.push({
          midi,
          startBeat: start + half * 2 + index * 0.25,
          durationBeats: 0.24,
          velocity: 0.66,
          hand: 'right',
        });
      });
    }
    return [...out, ...chord('left', start, bass, 4, 0.5)];
  };

  return {
    id: 'prelude-in-c',
    title: 'Prelude in C',
    composer: 'J.S. Bach',
    bpm: 68,
    beatsPerBar: 4,
    notes: sortNotes([
      ...figure(0, ['G4', 'C5', 'E5', 'G4', 'C5', 'E5', 'G4', 'C5'], ['C3', 'E3']),
      ...figure(4, ['A4', 'D5', 'F5', 'A4', 'D5', 'F5', 'A4', 'D5'], ['C3', 'D3']),
      ...figure(8, ['G4', 'D5', 'F5', 'G4', 'D5', 'F5', 'G4', 'D5'], ['B2', 'D3']),
      ...figure(12, ['G4', 'C5', 'E5', 'G4', 'C5', 'E5', 'G4', 'C5'], ['C3', 'E3']),
    ]),
    source: 'library',
    note: 'Public domain. The broken chords that open the Well-Tempered Clavier.',
  };
}

function minuetInG(): Piece {
  const right = line('right', 0, [
    ['D5', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
    ['D5', 1], ['G4', 1], ['G4', 1],
    ['E5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5],
    ['G5', 1], ['G4', 1], ['G4', 1],
  ]);
  const left = [
    ...chord('left', 0, ['G2', 'B2'], 3, 0.52),
    ...chord('left', 3, ['G2', 'B2'], 3, 0.52),
    ...chord('left', 6, ['C3', 'E3'], 3, 0.52),
    ...chord('left', 9, ['G2', 'B2'], 3, 0.52),
  ];
  return {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    composer: 'Petzold',
    bpm: 108,
    beatsPerBar: 3,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. Long attributed to Bach, from the Notebook for Anna Magdalena.',
  };
}

function greensleeves(): Piece {
  const right = line('right', 0, [
    ['A4', 1],
    ['C5', 1], ['D5', 0.5], ['E5', 0.75], ['F5', 0.25], ['E5', 0.5],
    ['D5', 1], ['B4', 0.5], ['G4', 0.75], ['A4', 0.25], ['B4', 0.5],
    ['C5', 1], ['A4', 0.5], ['A4', 0.75], ['G#4', 0.25], ['A4', 0.5],
    ['B4', 1], ['G#4', 0.5], ['E4', 1.5],
  ]);
  const left = [
    ...chord('left', 1, ['A2', 'E3'], 1.5, 0.5),
    ...chord('left', 4, ['G2', 'D3'], 1.5, 0.5),
    ...chord('left', 7, ['A2', 'E3'], 1.5, 0.5),
    ...chord('left', 10, ['E2', 'B2'], 1.5, 0.5),
  ];
  return {
    id: 'greensleeves',
    title: 'Greensleeves',
    composer: 'Traditional',
    bpm: 92,
    beatsPerBar: 3,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. Sixteenth century English ballad.',
  };
}

function amazingGrace(): Piece {
  const right = line('right', 0, [
    ['D4', 1],
    ['G4', 2], ['B4', 0.5], ['G4', 0.5],
    ['B4', 2], ['A4', 1],
    ['G4', 2], ['E4', 1],
    ['D4', 3],
    ['D4', 1],
    ['G4', 2], ['B4', 0.5], ['G4', 0.5],
    ['B4', 2], ['A4', 1],
    ['D5', 3],
  ]);
  const left = [
    ...chord('left', 1, ['G2', 'D3'], 3, 0.5),
    ...chord('left', 4, ['G2', 'D3'], 3, 0.5),
    ...chord('left', 7, ['C3', 'G3'], 3, 0.5),
    ...chord('left', 10, ['G2', 'D3'], 3, 0.5),
    ...chord('left', 14, ['G2', 'D3'], 3, 0.5),
    ...chord('left', 17, ['G2', 'D3'], 3, 0.5),
  ];
  return {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    composer: 'Traditional',
    bpm: 84,
    beatsPerBar: 3,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. Sung in 3/4 with a pickup.',
  };
}

function mountainKing(): Piece {
  const right = line('right', 0, [
    ['B3', 0.5], ['C#4', 0.5], ['D4', 0.5], ['E4', 0.5],
    ['F#4', 0.5], ['D4', 0.5], ['F#4', 1],
    ['F4', 0.5], ['D4', 0.5], ['F4', 1],
    ['E4', 0.5], ['C#4', 0.5], ['E4', 1],
    ['B3', 0.5], ['C#4', 0.5], ['D4', 0.5], ['E4', 0.5],
    ['F#4', 0.5], ['D4', 0.5], ['F#4', 0.5], ['A4', 0.5],
    ['G4', 0.5], ['F#4', 0.5], ['E4', 1],
  ], 0.72);
  const left = [
    ...chord('left', 0, ['B1', 'B2'], 2, 0.55),
    ...chord('left', 4, ['B1', 'B2'], 2, 0.55),
    ...chord('left', 6, ['B1', 'B2'], 2, 0.55),
    ...chord('left', 8, ['B1', 'B2'], 2, 0.55),
    ...chord('left', 10, ['B1', 'B2'], 2, 0.55),
  ];
  return {
    id: 'mountain-king',
    title: 'In the Hall of the Mountain King',
    composer: 'Grieg',
    bpm: 116,
    beatsPerBar: 4,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. Start slow and let it build.',
  };
}

function jingleBells(): Piece {
  const right = line('right', 0, [
    ['E4', 1], ['E4', 1], ['E4', 2],
    ['E4', 1], ['E4', 1], ['E4', 2],
    ['E4', 1], ['G4', 1], ['C4', 1], ['D4', 1],
    ['E4', 4],
    ['F4', 1], ['F4', 1], ['F4', 1], ['F4', 1],
    ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
    ['E4', 1], ['D4', 1], ['D4', 1], ['E4', 1],
    ['D4', 2], ['G4', 2],
  ]);
  const left = [
    ...chord('left', 0, ['C3', 'G3'], 4, 0.5),
    ...chord('left', 4, ['C3', 'G3'], 4, 0.5),
    ...chord('left', 8, ['C3', 'G3'], 4, 0.5),
    ...chord('left', 12, ['C3', 'G3'], 4, 0.5),
    ...chord('left', 16, ['F2', 'C3'], 4, 0.5),
    ...chord('left', 20, ['C3', 'G3'], 4, 0.5),
    ...chord('left', 24, ['G2', 'D3'], 4, 0.5),
    ...chord('left', 28, ['C3', 'G3'], 4, 0.5),
  ];
  return {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    composer: 'Pierpont',
    bpm: 120,
    beatsPerBar: 4,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. The chorus everyone already knows.',
  };
}

function scarborough(): Piece {
  const right = line('right', 0, [
    ['A4', 1],
    ['A4', 1], ['E5', 2], ['E5', 1],
    ['F#5', 2], ['E5', 1],
    ['D5', 2], ['C#5', 1],
    ['A4', 2], ['A4', 1],
    ['C#5', 2], ['D5', 1],
    ['A4', 3],
  ]);
  const left = [
    ...chord('left', 1, ['A2', 'E3'], 3, 0.5),
    ...chord('left', 4, ['G2', 'D3'], 3, 0.5),
    ...chord('left', 7, ['A2', 'E3'], 3, 0.5),
    ...chord('left', 10, ['G2', 'D3'], 3, 0.5),
    ...chord('left', 13, ['A2', 'E3'], 3, 0.5),
  ];
  return {
    id: 'scarborough-fair',
    title: 'Scarborough Fair',
    composer: 'Traditional',
    bpm: 96,
    beatsPerBar: 3,
    notes: sortNotes([...right, ...left]),
    source: 'library',
    note: 'Public domain. Dorian mode, gentle 3/4.',
  };
}

function bluesLick(): Piece {
  const right = line('right', 0, [
    ['C4', 0.5], ['D#4', 0.5], ['F4', 0.5], ['F#4', 0.5],
    ['G4', 0.5], ['A#4', 0.5], ['C5', 1],
    ['A#4', 0.5], ['G4', 0.5], ['F#4', 0.5], ['F4', 0.5],
    ['D#4', 0.5], ['C4', 1.5],
  ], 0.8);
  return {
    id: 'blues-scale',
    title: 'C blues scale',
    composer: 'Exercise',
    bpm: 100,
    beatsPerBar: 4,
    notes: sortNotes(right),
    source: 'library',
    note: 'Up and down the blues scale, right hand.',
  };
}

export const LIBRARY: Piece[] = [
  furElise(),
  moonlight(),
  canonInD(),
  preludeInC(),
  minuetInG(),
  odeToJoy(),
  greensleeves(),
  amazingGrace(),
  mountainKing(),
  scarborough(),
  jingleBells(),
  twinkle(),
  cMajorScale(),
  bluesLick(),
];

export function libraryPiece(id: string): Piece | undefined {
  return LIBRARY.find((piece) => piece.id === id);
}

export const DEFAULT_PIECE_ID = 'fur-elise';
