import { useEffect } from 'react';
import { midiToName, parseNote } from '../music/notes';
import { useDuetStore } from '../store/useDuetStore';
import { ERROR_CODES, err, type ActionResult } from '../store/types';
import {
  EMPTY_SCHEMA,
  READ_SCORE_SCHEMA,
  SEEK_SCHEMA,
  SET_COUNT_IN_SCHEMA,
  SET_LOOP_SCHEMA,
  SET_METRONOME_SCHEMA,
  SET_MIX_SCHEMA,
  GET_STATE_SCHEMA,
  HIGHLIGHT_SCHEMA,
  LISTEN_SCHEMA,
  LOAD_PIECE_SCHEMA,
  PLAY_NOTES_SCHEMA,
  PLAY_PIECE_SCHEMA,
  STOP_SCHEMA,
  TRANSFORM_SCHEMA,
} from './contracts';
import { serializeResult } from './result';
import {
  emptyInput,
  readScoreInput,
  seekInput,
  setCountInInput,
  setLoopInput,
  setMetronomeInput,
  setMixInput,
  getStateInput,
  highlightInput,
  listenInput,
  loadPieceInput,
  playNotesInput,
  playPieceInput,
  readPhraseInput,
  startPracticeInput,
  stopInput,
  toNotes,
  transformInput,
} from './schemas';
import { useWebMCPTool } from './useWebMCPTool';

const READ_ONLY = { readOnlyHint: true, untrustedContentHint: false } as const;
const MUTATING = { readOnlyHint: false, untrustedContentHint: false } as const;

type ZodLike<T> = { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } };

function parseOrError<T>(
  schema: ZodLike<T>,
  args: unknown,
): { ok: true; value: T } | { ok: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(args ?? {});
  if (!parsed.success || parsed.data === undefined) {
    const issues = parsed.error as { issues?: { path: (string | number)[]; message: string }[] };
    const detail =
      issues?.issues
        ?.slice(0, 3)
        .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
        .join('; ') ?? 'Arguments did not match the tool schema.';
    return {
      ok: false,
      result: err(ERROR_CODES.INVALID_INPUT, detail, useDuetStore.getState().stateVersion),
    };
  }
  return { ok: true, value: parsed.data };
}

export function DuetTools() {
  const getState = useWebMCPTool({
    name: 'duet.get_state',
    description:
      'Read the piano: whether audio is unlocked, whether the microphone is listening, what piece is loaded, its tempo and range, the built-in library, and whether practice mode is on. Call this first.',
    inputSchema: GET_STATE_SCHEMA,
    annotations: READ_ONLY,
    execute: (args: unknown) => {
      const parsed = parseOrError(getStateInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().getState();
    },
    formatOutput: serializeResult,
  });

  const getCapabilities = useWebMCPTool({
    name: 'duet.get_capabilities',
    description:
      'Discover what this build of Duet supports before planning: contract version, whether audio is unlocked, microphone availability, keyboard range, note limits, transport features, library size and the available modes.',
    inputSchema: EMPTY_SCHEMA,
    annotations: READ_ONLY,
    execute: (args: unknown) => {
      const parsed = parseOrError(emptyInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().getCapabilities();
    },
    formatOutput: serializeResult,
  });

  const readTransport = useWebMCPTool({
    name: 'duet.read_transport',
    description:
      'Read precise transport state: playing, paused or stopped, whether a count-in is running, position in bars and beats, tempo and percentage of the original, loop range, metronome, count-in bars and the hand mix.',
    inputSchema: EMPTY_SCHEMA,
    annotations: READ_ONLY,
    execute: (args: unknown) => {
      const parsed = parseOrError(emptyInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().readTransport();
    },
    formatOutput: serializeResult,
  });

  const readScore = useWebMCPTool({
    name: 'duet.read_score',
    description:
      'Read the loaded score a page at a time, with each note given as a name plus its bar, beat, length and hand. Use fromBar and toBar to narrow it, or pass the nextCursor from a previous call to continue. Nothing is silently truncated.',
    inputSchema: READ_SCORE_SCHEMA,
    annotations: READ_ONLY,
    execute: (args: unknown) => {
      const parsed = parseOrError(readScoreInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore
        .getState()
        .readScore(parsed.value.fromBar, parsed.value.toBar, parsed.value.cursor);
    },
    formatOutput: serializeResult,
  });

  const pause = useWebMCPTool({
    name: 'duet.pause',
    description:
      'Pause playback where it is, keeping the position so it can be resumed. Side effects: silences every sounding note and stops the playhead.',
    inputSchema: EMPTY_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(emptyInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().pausePlayback('agent');
    },
    formatOutput: serializeResult,
  });

  const resume = useWebMCPTool({
    name: 'duet.resume',
    description:
      'Resume from where playback was paused, without a count-in. Side effects: restarts the playhead and sound from the paused position.',
    inputSchema: EMPTY_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(emptyInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().resumePlayback('agent');
    },
    formatOutput: serializeResult,
  });

  const seek = useWebMCPTool({
    name: 'duet.seek',
    description:
      'Move the playhead to a bar or beat without starting playback, or jump there if it is already playing. Side effects: moves the playhead and the note strip.',
    inputSchema: SEEK_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(seekInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().seekTo(parsed.value, 'agent');
    },
    formatOutput: serializeResult,
  });

  const setLoop = useWebMCPTool({
    name: 'duet.set_loop',
    description:
      'Loop a range of bars so a phrase repeats seamlessly, or switch looping off. Side effects: reschedules playback and shows the loop on the transport.',
    inputSchema: SET_LOOP_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(setLoopInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().setLoop(parsed.value, 'agent');
    },
    formatOutput: serializeResult,
  });

  const setMetronome = useWebMCPTool({
    name: 'duet.set_metronome',
    description:
      'Turn the metronome on or off and set its subdivision and level. Side effects: adds or removes clicks from playback. It does not start playback by itself.',
    inputSchema: SET_METRONOME_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(setMetronomeInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().setMetronome(parsed.value, 'agent');
    },
    formatOutput: serializeResult,
  });

  const setCountIn = useWebMCPTool({
    name: 'duet.set_count_in',
    description:
      'Set how many bars of clicks play before the music starts, from zero to two. Side effects: applies to the next play, not the current one.',
    inputSchema: SET_COUNT_IN_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(setCountInInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().setCountIn(parsed.value.bars, 'agent');
    },
    formatOutput: serializeResult,
  });

  const setMix = useWebMCPTool({
    name: 'duet.set_mix',
    description:
      'Mute or unmute a hand so the learner can play along with the other one. Side effects: reschedules playback. Both hands cannot be muted at once.',
    inputSchema: SET_MIX_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(setMixInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().setMix(parsed.value, 'agent');
    },
    formatOutput: serializeResult,
  });

  const playNotes = useWebMCPTool({
    name: 'duet.play_notes',
    description:
      'Play notes on the piano right now. Give each note a name or MIDI number, a start in beats and a length in beats. Side effects: the keys light up and the notes sound through the speakers.',
    inputSchema: PLAY_NOTES_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(playNotesInput, args);
      if (!parsed.ok) return parsed.result;
      const { notes, rejected } = toNotes(parsed.value.notes);
      if (notes.length === 0) {
        return err(
          ERROR_CODES.INVALID_INPUT,
          `None of those notes are on an 88 key piano. Rejected: ${rejected.slice(0, 6).join(', ')}. Use A0 to C8.`,
          useDuetStore.getState().stateVersion,
        );
      }
      return useDuetStore
        .getState()
        .playNotes(notes, parsed.value.bpm, parsed.value.label, 'agent');
    },
    formatOutput: serializeResult,
  });

  const loadPiece = useWebMCPTool({
    name: 'duet.load_piece',
    description:
      'Load a score so it can be played, transformed and practised. Either pass a built-in pieceId, or send your own arrangement as notes with a title and tempo. Side effects: replaces the current score and stops playback.',
    inputSchema: LOAD_PIECE_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(loadPieceInput, args);
      if (!parsed.ok) return parsed.result;
      const value = parsed.value;
      if (value.pieceId) {
        return useDuetStore.getState().loadPiece({ pieceId: value.pieceId }, 'agent');
      }
      const { notes, rejected } = toNotes(value.notes ?? []);
      if (notes.length === 0) {
        return err(
          ERROR_CODES.INVALID_INPUT,
          `No playable notes. Rejected: ${rejected.slice(0, 6).join(', ')}.`,
          useDuetStore.getState().stateVersion,
        );
      }
      return useDuetStore.getState().loadPiece(
        {
          piece: {
            id: 'agent-piece',
            title: value.title ?? 'Untitled',
            composer: value.composer ?? 'Arranged by your agent',
            bpm: value.bpm ?? 96,
            beatsPerBar: value.beatsPerBar ?? 4,
            notes,
            source: 'agent',
          },
        },
        'agent',
      );
    },
    formatOutput: serializeResult,
  });

  const playPiece = useWebMCPTool({
    name: 'duet.play_piece',
    description:
      'Play the loaded score from the top or from a given bar. Side effects: the keys light up, the falling notes scroll and the piece sounds.',
    inputSchema: PLAY_PIECE_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(playPieceInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().playPiece(parsed.value.fromBar, 'agent');
    },
    formatOutput: serializeResult,
  });

  const stop = useWebMCPTool({
    name: 'duet.stop',
    description: 'Stop playback immediately. Side effects: silences every sounding note.',
    inputSchema: STOP_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(stopInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().stopPlaying('agent');
    },
    formatOutput: serializeResult,
  });

  const transform = useWebMCPTool({
    name: 'duet.transform_piece',
    description:
      'Change the loaded score: transpose it, change tempo, keep one hand, simplify it to one note per hand per beat, or take a range of bars. Always applied to the original score, so changes do not stack up. Side effects: replaces the current score.',
    inputSchema: TRANSFORM_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(transformInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().transform(parsed.value, 'agent');
    },
    formatOutput: serializeResult,
  });

  const highlight = useWebMCPTool({
    name: 'duet.highlight_keys',
    description:
      'Light up keys on the keyboard without playing them, for teaching a scale, a chord shape or a fingering. Side effects: draws the highlight and its label on the keyboard.',
    inputSchema: HIGHLIGHT_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(highlightInput, args);
      if (!parsed.ok) return parsed.result;
      const midi = parsed.value.keys
        .map((key) => parseNote(key))
        .filter((value): value is number => value !== null && value >= 21 && value <= 108);
      if (midi.length === 0) {
        return err(
          ERROR_CODES.INVALID_INPUT,
          'None of those keys are on an 88 key piano. Use names like C4 or numbers 21 to 108.',
          useDuetStore.getState().stateVersion,
        );
      }
      return useDuetStore.getState().highlightKeys(midi, parsed.value.label, 'agent');
    },
    formatOutput: serializeResult,
  });

  const listen = useWebMCPTool({
    name: 'duet.listen',
    description:
      'Start listening to the microphone so the person can sing or hum a phrase. The page detects the pitches; you cannot hear the microphone yourself. Side effects: opens the microphone and shows the listening state.',
    inputSchema: LISTEN_SCHEMA,
    annotations: MUTATING,
    execute: async (args: unknown) => {
      const parsed = parseOrError(listenInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().startListening('agent');
    },
    formatOutput: serializeResult,
  });

  const stopListening = useWebMCPTool({
    name: 'duet.stop_listening',
    description:
      'Stop listening and read back what was sung as a list of notes with their timing, so you can answer it, harmonise it or turn it into a piece. Side effects: closes the microphone.',
    inputSchema: LISTEN_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(listenInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().stopListening('agent');
    },
    formatOutput: serializeResult,
  });

  const readPhrase = useWebMCPTool({
    name: 'duet.read_phrase',
    description: 'Read the most recent sung phrase again as notes, without opening the microphone.',
    inputSchema: GET_STATE_SCHEMA,
    annotations: READ_ONLY,
    execute: (args: unknown) => {
      const parsed = parseOrError(readPhraseInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().readPhrase();
    },
    formatOutput: serializeResult,
  });

  const startPractice = useWebMCPTool({
    name: 'duet.start_practice',
    description:
      'Turn on practice mode for the loaded score. The keyboard waits for the person to play each chord in turn and counts hits and misses. Side effects: stops playback and arms the keyboard.',
    inputSchema: GET_STATE_SCHEMA,
    annotations: MUTATING,
    execute: (args: unknown) => {
      const parsed = parseOrError(startPracticeInput, args);
      if (!parsed.ok) return parsed.result;
      return useDuetStore.getState().startPractice('agent');
    },
    formatOutput: serializeResult,
  });

  const states = [
    getCapabilities,
    readTransport,
    readScore,
    pause,
    resume,
    seek,
    setLoop,
    setMetronome,
    setCountIn,
    setMix,
    getState,
    playNotes,
    loadPiece,
    playPiece,
    stop,
    transform,
    highlight,
    listen,
    stopListening,
    readPhrase,
    startPractice,
  ];

  const supported = states.some((state) => state.supported);
  const registered = states.filter((state) => state.registered).length;
  const setWebmcpStatus = useDuetStore((state) => state.setWebmcpStatus);

  useEffect(() => {
    setWebmcpStatus(supported, registered);
  }, [supported, registered, setWebmcpStatus]);

  void midiToName;
  return null;
}
