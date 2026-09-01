import { create } from 'zustand';
import { pianoEngine } from '../audio/engine';
import { transport } from '../audio/transport';
import { DEFAULT_PIECE_ID, LIBRARY, libraryPiece } from '../data/library';
import { midiToName } from '../music/notes';
import type { Hand, Note, Piece } from '../music/piece';
import { pieceDurationBeats, pieceRange, sortNotes } from '../music/piece';
import {
  filterHands,
  scaleTempo,
  setTempo as setPieceTempo,
  simplifyPiece,
  sliceBars,
  transposePiece,
} from '../music/transforms';
import { micListener } from '../pitch/listener';
import { rangeForPiece, type VisibleRange } from '../components/keyboard/range';
import {
  ERROR_CODES,
  err,
  ok,
  type ActionResult,
  type ActivityEntry,
  type ActivitySource,
} from './types';

export type MicState = 'idle' | 'granted' | 'listening' | 'denied';

export type LabelMode = 'notes' | 'qwerty';

export type PlayMode = 'demo' | 'playalong' | 'practice';

export type RangeMode = 'auto' | 'follow' | 'manual' | 'full';

export interface Highlight {
  midi: number[];
  label: string;
}

export interface PracticeState {
  active: boolean;
  index: number;
  expected: number[];
  hits: number;
  misses: number;
}

interface DuetState {
  audioReady: boolean;
  micState: MicState;
  piece: Piece;
  originalPiece: Piece;
  highlight: Highlight | null;
  lastPhrase: Note[] | null;
  practice: PracticeState;
  labelMode: LabelMode;
  mode: PlayMode;
  rangeMode: RangeMode;
  visibleRange: VisibleRange;
  activity: ActivityEntry[];
  stateVersion: number;
  webmcpSupported: boolean;
  webmcpToolCount: number;
  volume: number;

  unlockAudio: (source: ActivitySource) => Promise<boolean>;
  requestMic: () => Promise<boolean>;
  setVolume: (value: number) => void;
  setVisibleRange: (range: VisibleRange) => void;
  setLabelMode: (mode: LabelMode) => void;
  setRangeMode: (mode: RangeMode) => void;
  getCapabilities: () => ActionResult<Record<string, unknown>>;
  readTransport: () => ActionResult<Record<string, unknown>>;
  readScore: (
    fromBar?: number,
    toBar?: number,
    cursor?: number,
  ) => ActionResult<Record<string, unknown>>;
  pausePlayback: (source: ActivitySource) => ActionResult<Record<string, unknown>>;
  resumePlayback: (source: ActivitySource) => ActionResult<Record<string, unknown>>;
  seekTo: (
    input: { bar?: number; beat?: number },
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  setLoop: (
    input: { enabled?: boolean; fromBar?: number; toBar?: number },
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  setMetronome: (
    input: { enabled?: boolean; subdivision?: number; level?: number },
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  setCountIn: (bars: number, source: ActivitySource) => ActionResult<Record<string, unknown>>;
  setMix: (
    input: { left?: 'on' | 'muted'; right?: 'on' | 'muted' },
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  setMode: (mode: PlayMode, source: ActivitySource) => void;
  advancePlayAlong: () => void;
  setWebmcpStatus: (supported: boolean, count: number) => void;
  appendActivity: (source: ActivitySource, action: string, summary: string) => void;

  getState: () => ActionResult<Record<string, unknown>>;
  loadPiece: (
    input: { pieceId?: string; piece?: Piece },
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  playPiece: (fromBar: number | undefined, source: ActivitySource) => ActionResult<Record<string, unknown>>;
  playNotes: (
    notes: Note[],
    bpm: number | undefined,
    label: string | undefined,
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  stopPlaying: (source: ActivitySource) => ActionResult<Record<string, unknown>>;
  transform: (
    input: {
      transposeSemitones?: number;
      bpm?: number;
      tempoScale?: number;
      hands?: Hand[];
      simplify?: boolean;
      fromBar?: number;
      toBar?: number;
    },
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  highlightKeys: (
    midi: number[],
    label: string,
    source: ActivitySource,
  ) => ActionResult<Record<string, unknown>>;
  clearHighlight: () => void;
  startListening: (source: ActivitySource) => Promise<ActionResult<Record<string, unknown>>>;
  stopListening: (source: ActivitySource) => ActionResult<Record<string, unknown>>;
  readPhrase: () => ActionResult<Record<string, unknown>>;
  startPractice: (source: ActivitySource) => ActionResult<Record<string, unknown>>;
  stopPractice: () => void;
  pressKey: (midi: number) => void;
  resetDemo: () => void;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `a${counter}`;
}

function summarisePiece(piece: Piece) {
  const range = pieceRange(piece);
  return {
    title: piece.title,
    composer: piece.composer,
    bpm: piece.bpm,
    beatsPerBar: piece.beatsPerBar,
    noteCount: piece.notes.length,
    bars: Math.ceil(pieceDurationBeats(piece) / piece.beatsPerBar),
    range: range ? `${midiToName(range.low)}–${midiToName(range.high)}` : 'empty',
    hands: Array.from(new Set(piece.notes.map((note) => note.hand))).sort(),
    source: piece.source,
  };
}

function practiceExpected(piece: Piece, index: number): number[] {
  const starts = Array.from(new Set(piece.notes.map((note) => note.startBeat))).sort(
    (a, b) => a - b,
  );
  const beat = starts[index];
  if (beat === undefined) return [];
  return piece.notes.filter((note) => note.startBeat === beat).map((note) => note.midi);
}

const EMPTY_PRACTICE: PracticeState = {
  active: false,
  index: 0,
  expected: [],
  hits: 0,
  misses: 0,
};

export const useDuetStore = create<DuetState>((set, get) => {
  const seed = libraryPiece(DEFAULT_PIECE_ID)!;

  function bump(source: ActivitySource, action: string, summary: string): number {
    const version = get().stateVersion + 1;
    const entry: ActivityEntry = { id: nextId(), source, action, summary, stateVersion: version };
    set((state) => ({ stateVersion: version, activity: [entry, ...state.activity].slice(0, 50) }));
    return version;
  }

  function requireAudio(): ActionResult<never> | null {
    if (pianoEngine.ready) return null;
    return err(
      ERROR_CODES.AUDIO_LOCKED,
      'The browser has not allowed audio yet. Ask the person to press Enable sound, then retry.',
      get().stateVersion,
    );
  }

  return {
    audioReady: false,
    micState: 'idle',
    piece: seed,
    originalPiece: seed,
    highlight: null,
    lastPhrase: null,
    practice: EMPTY_PRACTICE,
    labelMode: 'notes',
    mode: 'demo',
    rangeMode: 'auto',
    visibleRange: rangeForPiece(seed),
    activity: [],
    stateVersion: 1,
    webmcpSupported: false,
    webmcpToolCount: 0,
    volume: 0.75,

    unlockAudio: async (source) => {
      const ready = await pianoEngine.unlock();
      set({ audioReady: ready });
      if (ready) bump(source, 'enable_sound', 'Sound enabled for this tab.');
      return ready;
    },

    requestMic: async () => {
      const granted = await micListener.request();
      set({ micState: granted ? 'granted' : 'denied' });
      return granted;
    },

    setVolume: (value) => {
      pianoEngine.setVolume(value);
      set({ volume: value });
    },

    setVisibleRange: (range) => set({ visibleRange: range }),

    setLabelMode: (labelMode) => set({ labelMode }),

    setRangeMode: (rangeMode) => {
      const state = get();
      set({ rangeMode });
      if (rangeMode === 'full') set({ visibleRange: { from: 21, to: 108 } });
      else if (rangeMode !== 'manual') set({ visibleRange: rangeForPiece(state.piece) });
    },

    getCapabilities: () => {
      const state = get();
      return ok(
        'Duet capabilities.',
        state.stateVersion,
        {
          contractVersion: '1.0',
          audio: { unlocked: state.audioReady, engine: 'web-audio-synth' },
          microphone: { supported: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices), state: state.micState },
          keyboard: { lowest: 'A0', highest: 'C8', visibleKeys: 17 },
          noteLimits: { perPlayNotes: 400, perLoadPiece: 600 },
          transport: ['play', 'pause', 'resume', 'stop', 'seek', 'loop', 'count_in', 'metronome', 'mix'],
          library: LIBRARY.length,
          formats: { import: [], export: [] },
          modes: ['demo', 'playalong', 'practice'],
        },
        ['get_state', 'read_transport'],
      );
    },

    readTransport: () => {
      const state = get();
      const total = pieceDurationBeats(state.piece);
      const beat = transport.positionBeats();
      return ok(
        `${transport.isPlaying ? 'Playing' : transport.isPaused ? 'Paused' : 'Stopped'} at bar ${Math.floor(beat / state.piece.beatsPerBar) + 1}.`,
        state.stateVersion,
        {
          status: transport.isPlaying ? 'playing' : transport.isPaused ? 'paused' : 'stopped',
          countingIn: transport.inCountIn,
          positionBeat: Math.round(beat * 100) / 100,
          positionBar: Math.floor(beat / state.piece.beatsPerBar) + 1,
          totalBars: Math.ceil(total / state.piece.beatsPerBar),
          bpm: state.piece.bpm,
          percentOfOriginal: Math.round((state.piece.bpm / state.originalPiece.bpm) * 100),
          loop: transport.loop.enabled
            ? {
                enabled: true,
                fromBar: Math.floor(transport.loop.startBeat / state.piece.beatsPerBar) + 1,
                toBar: Math.ceil(transport.loop.endBeat / state.piece.beatsPerBar),
              }
            : { enabled: false },
          metronome: transport.metronome,
          countInBars: transport.getCountInBars(),
          mix: transport.mix,
        },
        ['play_piece', 'seek', 'set_loop'],
      );
    },

    readScore: (fromBar, toBar, cursor) => {
      const state = get();
      const piece = state.piece;
      const perPage = 12;
      const startBeat = fromBar ? (fromBar - 1) * piece.beatsPerBar : 0;
      const endBeat = toBar ? toBar * piece.beatsPerBar : Number.POSITIVE_INFINITY;
      const all = piece.notes.filter(
        (note) => note.startBeat >= startBeat - 1e-6 && note.startBeat < endBeat - 1e-6,
      );
      const offset = cursor ?? 0;
      if (offset >= all.length && all.length > 0) {
        return err(
          ERROR_CODES.POSITION_INVALID,
          `Cursor ${offset} is past the end. This selection has ${all.length} notes.`,
          state.stateVersion,
        );
      }
      const page = all.slice(offset, offset + perPage);
      const nextCursor = offset + perPage < all.length ? offset + perPage : null;
      return ok(
        `Notes ${offset + 1} to ${offset + page.length} of ${all.length}.`,
        state.stateVersion,
        {
          title: piece.title,
          bpm: piece.bpm,
          beatsPerBar: piece.beatsPerBar,
          totalNotes: all.length,
          notes: page.map((note) => ({
            note: midiToName(note.midi),
            bar: Math.floor(note.startBeat / piece.beatsPerBar) + 1,
            beat: Math.round((note.startBeat % piece.beatsPerBar) * 100) / 100 + 1,
            duration: note.durationBeats,
            hand: note.hand,
          })),
          nextCursor,
        },
        nextCursor === null ? ['play_piece'] : ['read_score'],
      );
    },

    pausePlayback: (source) => {
      const state = get();
      if (!transport.isPlaying) {
        return err(ERROR_CODES.NOTHING_LOADED, 'Nothing is playing.', state.stateVersion);
      }
      const beat = transport.pause();
      const version = bump(source, 'pause', `Paused at beat ${beat.toFixed(1)}.`);
      return ok(`Paused at beat ${beat.toFixed(1)}.`, version, { positionBeat: Math.round(beat * 100) / 100 }, ['resume', 'seek']);
    },

    resumePlayback: (source) => {
      const state = get();
      if (!transport.resume()) {
        return err(ERROR_CODES.NOTHING_LOADED, 'Nothing is paused. Call play_piece.', state.stateVersion);
      }
      const version = bump(source, 'resume', 'Resumed playback.');
      return ok('Resumed.', version, { positionBeat: Math.round(transport.positionBeats() * 100) / 100 }, ['pause', 'stop']);
    },

    seekTo: (input, source) => {
      const state = get();
      const piece = state.piece;
      const total = pieceDurationBeats(piece);
      const beat = input.beat !== undefined ? input.beat : ((input.bar ?? 1) - 1) * piece.beatsPerBar;
      if (beat < 0 || beat > total) {
        return err(
          ERROR_CODES.POSITION_INVALID,
          `That position is outside the piece, which is ${Math.ceil(total / piece.beatsPerBar)} bars long.`,
          state.stateVersion,
        );
      }
      const landed = transport.seek(beat);
      const version = bump(source, 'seek', `Moved to bar ${Math.floor(landed / piece.beatsPerBar) + 1}.`);
      return ok(
        `Playhead at bar ${Math.floor(landed / piece.beatsPerBar) + 1}.`,
        version,
        { positionBeat: Math.round(landed * 100) / 100, positionBar: Math.floor(landed / piece.beatsPerBar) + 1 },
        ['play_piece', 'set_loop'],
      );
    },

    setLoop: (input, source) => {
      const state = get();
      const piece = state.piece;
      const totalBars = Math.ceil(pieceDurationBeats(piece) / piece.beatsPerBar);
      if (input.enabled === false) {
        transport.setLoop({ enabled: false });
        const version = bump(source, 'set_loop', 'Loop off.');
        return ok('Loop turned off.', version, { enabled: false }, ['play_piece']);
      }
      const fromBar = input.fromBar ?? 1;
      const toBar = input.toBar ?? fromBar + 3;
      if (fromBar < 1 || toBar > totalBars || toBar < fromBar) {
        return err(
          ERROR_CODES.LOOP_INVALID,
          `Loop must fall inside bars 1 to ${totalBars} with the start before the end.`,
          state.stateVersion,
        );
      }
      transport.setLoop({
        enabled: true,
        startBeat: (fromBar - 1) * piece.beatsPerBar,
        endBeat: toBar * piece.beatsPerBar,
      });
      const version = bump(source, 'set_loop', `Looping bars ${fromBar} to ${toBar}.`);
      return ok(
        `Looping bars ${fromBar} to ${toBar}.`,
        version,
        { enabled: true, fromBar, toBar },
        ['play_piece', 'start_practice'],
      );
    },

    setMetronome: (input, source) => {
      const next = transport.setMetronome({
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.subdivision !== undefined ? { subdivision: input.subdivision } : {}),
        ...(input.level !== undefined ? { level: input.level } : {}),
      });
      const version = bump(source, 'set_metronome', `Metronome ${next.enabled ? 'on' : 'off'}.`);
      return ok(
        `Metronome ${next.enabled ? 'on' : 'off'}.`,
        version,
        { enabled: next.enabled, subdivision: next.subdivision, level: next.level },
        ['play_piece'],
      );
    },

    setCountIn: (bars, source) => {
      const state = get();
      if (bars < 0 || bars > 2) {
        return err(ERROR_CODES.INVALID_INPUT, 'Count-in must be 0, 1 or 2 bars.', state.stateVersion);
      }
      const next = transport.setCountInBars(bars);
      const version = bump(source, 'set_count_in', `Count-in ${next} bar(s).`);
      return ok(`Count-in set to ${next} bar(s).`, version, { countInBars: next }, ['play_piece']);
    },

    setMix: (input, source) => {
      const state = get();
      const next = transport.setMix(input);
      if (next.left === 'muted' && next.right === 'muted') {
        transport.setMix({ left: 'on', right: 'on' });
        return err(ERROR_CODES.INVALID_INPUT, 'Both hands cannot be muted at once.', state.stateVersion);
      }
      const version = bump(source, 'set_mix', `Left ${next.left}, right ${next.right}.`);
      return ok(
        `Left hand ${next.left}, right hand ${next.right}.`,
        version,
        { left: next.left, right: next.right },
        ['play_piece'],
      );
    },

    setMode: (mode, source) => {
      const state = get();
      transport.stop();
      if (mode === 'demo') {
        set({ mode, practice: EMPTY_PRACTICE });
      } else {
        const expected = practiceExpected(state.piece, 0);
        set({
          mode,
          practice: { active: true, index: 0, expected, hits: 0, misses: 0 },
        });
      }
      bump(source, 'set_mode', `Switched to ${mode === 'playalong' ? 'play along' : mode} mode.`);
    },

    advancePlayAlong: () => {
      const state = get();
      if (!state.practice.active) return;
      const expected = state.practice.expected;
      const bpm = state.piece.bpm;
      for (const midi of expected) {
        const note = state.piece.notes.find(
          (entry) => entry.midi === midi && entry.startBeat >= 0,
        );
        transport.strike(midi, 0.8, ((note?.durationBeats ?? 1) * 60) / bpm);
      }
      const nextIndex = state.practice.index + 1;
      const nextExpected = practiceExpected(state.piece, nextIndex);
      set({
        practice: {
          active: nextExpected.length > 0,
          index: nextIndex,
          expected: nextExpected,
          hits: state.practice.hits + 1,
          misses: state.practice.misses,
        },
      });
    },

    setWebmcpStatus: (supported, count) => set({ webmcpSupported: supported, webmcpToolCount: count }),

    appendActivity: (source, action, summary) => {
      bump(source, action, summary);
    },

    getState: () => {
      const state = get();
      return ok(
        `${state.piece.title} loaded at ${Math.round(state.piece.bpm)} bpm. Audio ${state.audioReady ? 'ready' : 'locked'}.`,
        state.stateVersion,
        {
          audioReady: state.audioReady,
          micState: state.micState,
          playing: transport.isPlaying,
          piece: summarisePiece(state.piece),
          keyboardShowing: `${midiToName(state.visibleRange.from)} to ${midiToName(state.visibleRange.to)}`,
          library: LIBRARY.map((entry) => `${entry.id}: ${entry.title}`),
          lastPhraseNotes: state.lastPhrase ? state.lastPhrase.length : 0,
          practice: state.practice.active
            ? `step ${state.practice.index + 1}, ${state.practice.hits} hit / ${state.practice.misses} missed`
            : 'off',
        },
        state.audioReady
          ? ['play_notes', 'load_piece', 'play_piece', 'listen']
          : ['ask the person to press Enable sound'],
      );
    },

    loadPiece: (input, source) => {
      const state = get();
      let piece: Piece | undefined;

      if (input.piece) {
        piece = { ...input.piece, notes: sortNotes(input.piece.notes) };
      } else if (input.pieceId) {
        piece = libraryPiece(input.pieceId);
        if (!piece) {
          return err(
            ERROR_CODES.UNKNOWN_PIECE,
            `No piece called ${input.pieceId}. Known ids: ${LIBRARY.map((entry) => entry.id).join(', ')}. You can also send your own notes.`,
            state.stateVersion,
          );
        }
      }

      if (!piece || piece.notes.length === 0) {
        return err(
          ERROR_CODES.INVALID_INPUT,
          'Provide either a known pieceId or a piece with at least one note.',
          state.stateVersion,
        );
      }

      transport.setPiece(piece);
      set({
        piece,
        originalPiece: piece,
        practice: EMPTY_PRACTICE,
        highlight: null,
        visibleRange: rangeForPiece(piece),
      });
      const version = bump(source, 'load_piece', `Loaded ${piece.title} (${piece.notes.length} notes).`);

      return ok(
        `Loaded ${piece.title}. ${piece.notes.length} notes across ${Math.ceil(pieceDurationBeats(piece) / piece.beatsPerBar)} bars.`,
        version,
        summarisePiece(piece),
        ['play_piece', 'transform_piece', 'start_practice'],
      );
    },

    playPiece: (fromBar, source) => {
      const locked = requireAudio();
      if (locked) return locked;
      const state = get();
      const piece = state.piece;
      if (piece.notes.length === 0) {
        return err(ERROR_CODES.NOTHING_LOADED, 'No piece is loaded.', state.stateVersion);
      }
      const fromBeat = fromBar ? (fromBar - 1) * piece.beatsPerBar : 0;
      const result = transport.play(piece, fromBeat);
      const version = bump(
        source,
        'play_piece',
        `Playing ${piece.title}${fromBar ? ` from bar ${fromBar}` : ''} at ${Math.round(piece.bpm)} bpm.`,
      );
      return ok(
        `Playing ${piece.title} at ${Math.round(piece.bpm)} bpm. ${result.scheduled} notes over ${result.durationSeconds.toFixed(1)} seconds.`,
        version,
        { title: piece.title, bpm: piece.bpm, seconds: Math.round(result.durationSeconds * 10) / 10 },
        ['stop', 'transform_piece'],
      );
    },

    playNotes: (notes, bpm, label, source) => {
      const locked = requireAudio();
      if (locked) return locked;
      const state = get();
      if (notes.length === 0) {
        return err(ERROR_CODES.INVALID_INPUT, 'Send at least one note.', state.stateVersion);
      }
      const tempo = bpm ?? state.piece.bpm;
      const result = transport.playNotesNow(sortNotes(notes), tempo);
      const names = notes.slice(0, 6).map((note) => midiToName(note.midi));
      const version = bump(
        source,
        'play_notes',
        `${label ?? 'Played'} ${notes.length} notes: ${names.join(' ')}${notes.length > 6 ? '…' : ''}`,
      );
      return ok(
        `Played ${result.scheduled} notes over ${result.durationSeconds.toFixed(1)} seconds at ${tempo} bpm.`,
        version,
        { played: result.scheduled, seconds: Math.round(result.durationSeconds * 10) / 10, first: names },
        ['play_notes', 'listen', 'get_state'],
      );
    },

    stopPlaying: (source) => {
      transport.stop();
      const version = bump(source, 'stop', 'Playback stopped.');
      return ok('Stopped.', version, { playing: false }, ['play_piece', 'play_notes']);
    },

    transform: (input, source) => {
      const state = get();
      let piece = state.originalPiece;
      const applied: string[] = [];

      if (input.fromBar !== undefined || input.toBar !== undefined) {
        const from = input.fromBar ?? 1;
        const to = input.toBar ?? Math.ceil(pieceDurationBeats(piece) / piece.beatsPerBar);
        piece = sliceBars(piece, from, to);
        applied.push(`bars ${from}-${to}`);
        if (piece.notes.length === 0) {
          return err(
            ERROR_CODES.INVALID_INPUT,
            `Bars ${from}-${to} contain no notes. The piece has ${Math.ceil(pieceDurationBeats(state.originalPiece) / state.originalPiece.beatsPerBar)} bars.`,
            state.stateVersion,
          );
        }
      }
      if (input.hands && input.hands.length > 0) {
        piece = filterHands(piece, input.hands);
        applied.push(`${input.hands.join(' and ')} hand`);
        if (piece.notes.length === 0) {
          return err(
            ERROR_CODES.INVALID_INPUT,
            `This piece has no ${input.hands.join(' or ')} hand notes.`,
            state.stateVersion,
          );
        }
      }
      if (input.simplify) {
        piece = simplifyPiece(piece);
        applied.push('simplified');
      }
      if (input.transposeSemitones) {
        piece = transposePiece(piece, input.transposeSemitones);
        applied.push(`transposed ${input.transposeSemitones > 0 ? '+' : ''}${input.transposeSemitones}`);
      }
      if (input.bpm) {
        piece = setPieceTempo(piece, input.bpm);
        applied.push(`${piece.bpm} bpm`);
      } else if (input.tempoScale) {
        piece = scaleTempo(piece, input.tempoScale);
        applied.push(`${piece.bpm} bpm`);
      }

      if (applied.length === 0) {
        return err(
          ERROR_CODES.INVALID_INPUT,
          'Provide at least one change: transposeSemitones, bpm, tempoScale, hands, simplify, or a bar range.',
          state.stateVersion,
        );
      }

      transport.setPiece(piece);
      set({
        piece,
        practice: EMPTY_PRACTICE,
        visibleRange:
          get().rangeMode === 'full' ? { from: 21, to: 108 } : rangeForPiece(piece),
      });
      const version = bump(source, 'transform_piece', `${piece.title}: ${applied.join(', ')}.`);
      return ok(
        `Applied ${applied.join(', ')}. ${piece.notes.length} notes remain.`,
        version,
        summarisePiece(piece),
        ['play_piece', 'start_practice'],
      );
    },

    highlightKeys: (midi, label, source) => {
      const state = get();
      if (midi.length === 0) {
        return err(ERROR_CODES.INVALID_INPUT, 'Send at least one key.', state.stateVersion);
      }
      set({ highlight: { midi, label } });
      const version = bump(source, 'highlight_keys', `${label}: ${midi.map(midiToName).join(' ')}`);
      return ok(
        `Highlighted ${midi.length} keys on the keyboard: ${midi.map(midiToName).join(' ')}.`,
        version,
        { label, keys: midi.map(midiToName) },
        ['play_notes', 'clear'],
      );
    },

    clearHighlight: () => set({ highlight: null }),

    startListening: async (source) => {
      const state = get();
      if (state.micState === 'listening') {
        return err(ERROR_CODES.ALREADY_LISTENING, 'Already listening. Call stop_listening.', state.stateVersion);
      }
      const granted = await micListener.request();
      if (!granted) {
        set({ micState: 'denied' });
        return err(
          ERROR_CODES.MIC_UNAVAILABLE,
          'The microphone is not available. Ask the person to press Sing and allow the microphone.',
          state.stateVersion,
        );
      }
      micListener.start();
      set({ micState: 'listening' });
      const version = bump(source, 'listen', 'Listening to the microphone.');
      return ok(
        'Listening. Ask the person to sing or hum a phrase, then call stop_listening to read it back.',
        version,
        { listening: true },
        ['stop_listening'],
      );
    },

    stopListening: (source) => {
      const state = get();
      if (state.micState !== 'listening') {
        return err(ERROR_CODES.NOT_LISTENING, 'Not currently listening.', state.stateVersion);
      }
      const result = micListener.stop(state.piece.bpm);
      set({ micState: 'granted', lastPhrase: result.notes });
      if (result.notes.length === 0) {
        const version = bump(source, 'stop_listening', 'Heard nothing usable.');
        return err(
          ERROR_CODES.NOTHING_HEARD,
          `No steady pitch was heard in ${result.sampleCount} samples. Ask the person to sing closer to the microphone and try again.`,
          version,
        );
      }
      const names = result.notes.map((note) => midiToName(note.midi));
      const version = bump(
        source,
        'stop_listening',
        `Heard ${result.notes.length} notes: ${names.slice(0, 8).join(' ')}`,
      );
      return ok(
        `Heard ${result.notes.length} notes over ${result.voicedSeconds} seconds of voice: ${names.join(' ')}.`,
        version,
        {
          notes: result.notes.map((note) => ({
            note: midiToName(note.midi),
            startBeat: Math.round(note.startBeat * 100) / 100,
            durationBeats: Math.round(note.durationBeats * 100) / 100,
          })),
          bpm: state.piece.bpm,
        },
        ['play_notes'],
      );
    },

    readPhrase: () => {
      const state = get();
      if (!state.lastPhrase || state.lastPhrase.length === 0) {
        return err(ERROR_CODES.NOTHING_HEARD, 'Nothing has been sung yet. Call listen first.', state.stateVersion);
      }
      return ok(
        `The last phrase was ${state.lastPhrase.length} notes.`,
        state.stateVersion,
        {
          notes: state.lastPhrase.map((note) => ({
            note: midiToName(note.midi),
            startBeat: Math.round(note.startBeat * 100) / 100,
            durationBeats: Math.round(note.durationBeats * 100) / 100,
          })),
          bpm: state.piece.bpm,
        },
        ['play_notes'],
      );
    },

    startPractice: (source) => {
      const state = get();
      if (state.piece.notes.length === 0) {
        return err(ERROR_CODES.NOTHING_LOADED, 'No piece is loaded.', state.stateVersion);
      }
      transport.stop();
      const expected = practiceExpected(state.piece, 0);
      set({ practice: { active: true, index: 0, expected, hits: 0, misses: 0 } });
      const version = bump(source, 'start_practice', `Practice started on ${state.piece.title}.`);
      return ok(
        `Practice mode on for ${state.piece.title}. The keyboard now waits for the person to play each chord in turn.`,
        version,
        { firstKeys: expected.map(midiToName) },
        ['get_state'],
      );
    },

    stopPractice: () => set({ practice: EMPTY_PRACTICE }),

    pressKey: (midi) => {
      const state = get();
      if (state.mode === 'playalong' && state.practice.active) {
        get().advancePlayAlong();
        return;
      }
      transport.strike(midi, 0.8, 0.9);
      if (!state.practice.active) return;

      const expected = state.practice.expected;
      if (expected.includes(midi)) {
        const remaining = expected.filter((entry) => entry !== midi);
        if (remaining.length > 0) {
          set({ practice: { ...state.practice, expected: remaining } });
          return;
        }
        const nextIndex = state.practice.index + 1;
        const nextExpected = practiceExpected(state.piece, nextIndex);
        set({
          practice: {
            active: nextExpected.length > 0,
            index: nextIndex,
            expected: nextExpected,
            hits: state.practice.hits + 1,
            misses: state.practice.misses,
          },
        });
      } else {
        set({ practice: { ...state.practice, misses: state.practice.misses + 1 } });
      }
    },

    resetDemo: () => {
      transport.stop();
      const fresh = libraryPiece(DEFAULT_PIECE_ID)!;
      set({
        piece: fresh,
        originalPiece: fresh,
        highlight: null,
        lastPhrase: null,
        practice: EMPTY_PRACTICE,
        mode: 'demo',
        visibleRange: rangeForPiece(fresh),
        activity: [],
        stateVersion: 1,
      });
    },
  };
});
