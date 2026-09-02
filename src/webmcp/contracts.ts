const NOTE_ARRAY = {
  type: 'array',
  minItems: 1,
  maxItems: 400,
  items: {
    type: 'object',
    properties: {
      note: {
        type: ['string', 'number'],
        description: 'Note name such as C4, F#3 or Bb5, or a MIDI number 21-108.',
      },
      start: { type: 'number', minimum: 0, description: 'Start position in beats from zero.' },
      duration: { type: 'number', minimum: 0.05, description: 'Length in beats.' },
      velocity: { type: 'number', minimum: 0.05, maximum: 1, description: 'How hard to strike.' },
      hand: { type: 'string', enum: ['left', 'right'], description: 'Which hand plays it.' },
    },
    required: ['note', 'start', 'duration'],
    additionalProperties: false,
  },
} as const;

export const GET_STATE_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

export const PLAY_NOTES_SCHEMA = {
  type: 'object',
  properties: {
    notes: NOTE_ARRAY,
    bpm: { type: 'number', minimum: 20, maximum: 240, description: 'Tempo for these notes.' },
    label: { type: 'string', maxLength: 80, description: 'What this is, shown in the activity log.' },
  },
  required: ['notes'],
  additionalProperties: false,
} as const;

export const LOAD_PIECE_SCHEMA = {
  type: 'object',
  properties: {
    pieceId: {
      type: 'string',
      description: 'Id of a built-in piece. Call get_state for the list.',
    },
    title: { type: 'string', maxLength: 80 },
    composer: { type: 'string', maxLength: 80 },
    bpm: { type: 'number', minimum: 20, maximum: 240 },
    beatsPerBar: { type: 'integer', minimum: 1, maximum: 12 },
    notes: { ...NOTE_ARRAY, maxItems: 600 },
  },
  additionalProperties: false,
} as const;

export const PLAY_PIECE_SCHEMA = {
  type: 'object',
  properties: {
    fromBar: { type: 'integer', minimum: 1, description: 'Bar to start from. Defaults to the top.' },
  },
  additionalProperties: false,
} as const;

export const STOP_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

export const TRANSFORM_SCHEMA = {
  type: 'object',
  properties: {
    transposeSemitones: { type: 'integer', minimum: -24, maximum: 24 },
    bpm: { type: 'number', minimum: 20, maximum: 240 },
    tempoScale: { type: 'number', minimum: 0.25, maximum: 3, description: '0.7 means 70 percent speed.' },
    hands: { type: 'array', items: { type: 'string', enum: ['left', 'right'] }, minItems: 1, maxItems: 2 },
    simplify: { type: 'boolean', description: 'Keep one note per hand per beat.' },
    fromBar: { type: 'integer', minimum: 1 },
    toBar: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
} as const;

export const HIGHLIGHT_SCHEMA = {
  type: 'object',
  properties: {
    keys: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: { type: ['string', 'number'] },
      description: 'Notes to light up without sounding them.',
    },
    label: { type: 'string', maxLength: 60, description: 'What these keys are, shown on screen.' },
  },
  required: ['keys', 'label'],
  additionalProperties: false,
} as const;

export const LISTEN_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

export const EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

export const READ_SCORE_SCHEMA = {
  type: 'object',
  properties: {
    fromBar: { type: 'integer', minimum: 1, description: 'First bar to read.' },
    toBar: { type: 'integer', minimum: 1, description: 'Last bar to read.' },
    cursor: { type: 'integer', minimum: 0, description: 'Continue from a previous nextCursor.' },
  },
  additionalProperties: false,
} as const;

export const SEEK_SCHEMA = {
  type: 'object',
  properties: {
    bar: { type: 'integer', minimum: 1, description: 'Bar to move the playhead to.' },
    beat: { type: 'number', minimum: 0, description: 'Exact beat, if you need finer than a bar.' },
  },
  additionalProperties: false,
} as const;

export const SET_LOOP_SCHEMA = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean', description: 'Set false to switch looping off.' },
    fromBar: { type: 'integer', minimum: 1, description: 'First bar of the loop.' },
    toBar: { type: 'integer', minimum: 1, description: 'Last bar of the loop.' },
  },
  additionalProperties: false,
} as const;

export const SET_METRONOME_SCHEMA = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    subdivision: { type: 'integer', minimum: 1, maximum: 4, description: '1 for beats, 2 for eighths.' },
    level: { type: 'number', minimum: 0, maximum: 1 },
  },
  additionalProperties: false,
} as const;

export const SET_COUNT_IN_SCHEMA = {
  type: 'object',
  properties: {
    bars: { type: 'integer', minimum: 0, maximum: 2, description: 'Bars of clicks before playing.' },
  },
  required: ['bars'],
  additionalProperties: false,
} as const;

export const SET_MIX_SCHEMA = {
  type: 'object',
  properties: {
    left: { type: 'string', enum: ['on', 'muted'], description: 'Left hand.' },
    right: { type: 'string', enum: ['on', 'muted'], description: 'Right hand.' },
  },
  additionalProperties: false,
} as const;
