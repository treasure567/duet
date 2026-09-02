import { z } from 'zod';
import { parseNote } from '../music/notes';
import type { Note } from '../music/piece';

const noteValue = z.union([z.string().min(1).max(6), z.number()]);

export const noteInput = z.object({
  note: noteValue,
  start: z.number().min(0).max(2048),
  duration: z.number().min(0.05).max(64),
  velocity: z.number().min(0.05).max(1).optional(),
  hand: z.enum(['left', 'right']).optional(),
});

export type NoteInput = z.infer<typeof noteInput>;

export function toNotes(input: NoteInput[]): { notes: Note[]; rejected: string[] } {
  const notes: Note[] = [];
  const rejected: string[] = [];
  for (const entry of input) {
    const midi = parseNote(entry.note);
    if (midi === null || midi < 21 || midi > 108) {
      rejected.push(String(entry.note));
      continue;
    }
    notes.push({
      midi,
      startBeat: entry.start,
      durationBeats: entry.duration,
      velocity: entry.velocity ?? 0.78,
      hand: entry.hand ?? 'right',
    });
  }
  return { notes, rejected };
}

export const getStateInput = z.object({}).strict();

export const playNotesInput = z
  .object({
    notes: z.array(noteInput).min(1).max(400),
    bpm: z.number().min(20).max(240).optional(),
    label: z.string().max(80).optional(),
  })
  .strict();

export const loadPieceInput = z
  .object({
    pieceId: z.string().min(1).max(40).optional(),
    title: z.string().min(1).max(80).optional(),
    composer: z.string().max(80).optional(),
    bpm: z.number().min(20).max(240).optional(),
    beatsPerBar: z.number().int().min(1).max(12).optional(),
    notes: z.array(noteInput).min(1).max(600).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.pieceId) !== Boolean(value.notes), {
    message: 'Send either pieceId for a library piece, or notes for your own arrangement.',
  });

export const playPieceInput = z
  .object({ fromBar: z.number().int().min(1).max(400).optional() })
  .strict();

export const stopInput = z.object({}).strict();

export const transformInput = z
  .object({
    transposeSemitones: z.number().int().min(-24).max(24).optional(),
    bpm: z.number().min(20).max(240).optional(),
    tempoScale: z.number().min(0.25).max(3).optional(),
    hands: z.array(z.enum(['left', 'right'])).min(1).max(2).optional(),
    simplify: z.boolean().optional(),
    fromBar: z.number().int().min(1).max(400).optional(),
    toBar: z.number().int().min(1).max(400).optional(),
  })
  .strict();

export const highlightInput = z
  .object({
    keys: z.array(noteValue).min(1).max(24),
    label: z.string().min(1).max(60),
  })
  .strict();

export const listenInput = z.object({}).strict();
export const readPhraseInput = z.object({}).strict();
export const startPracticeInput = z.object({}).strict();

export const emptyInput = z.object({}).strict();

export const readScoreInput = z
  .object({
    fromBar: z.number().int().min(1).max(999).optional(),
    toBar: z.number().int().min(1).max(999).optional(),
    cursor: z.number().int().min(0).max(100000).optional(),
  })
  .strict();

export const seekInput = z
  .object({
    bar: z.number().int().min(1).max(999).optional(),
    beat: z.number().min(0).max(9999).optional(),
  })
  .strict()
  .refine((value) => value.bar !== undefined || value.beat !== undefined, {
    message: 'Provide a bar or a beat.',
  });

export const setLoopInput = z
  .object({
    enabled: z.boolean().optional(),
    fromBar: z.number().int().min(1).max(999).optional(),
    toBar: z.number().int().min(1).max(999).optional(),
  })
  .strict();

export const setMetronomeInput = z
  .object({
    enabled: z.boolean().optional(),
    subdivision: z.number().int().min(1).max(4).optional(),
    level: z.number().min(0).max(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide something to change.' });

export const setCountInInput = z
  .object({ bars: z.number().int().min(0).max(2) })
  .strict();

export const setMixInput = z
  .object({
    left: z.enum(['on', 'muted']).optional(),
    right: z.enum(['on', 'muted']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide a hand to change.' });
