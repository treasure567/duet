import { beforeEach, describe, expect, it } from 'vitest';
import { transport } from '../audio/transport';
import { libraryPiece } from '../data/library';
import { pieceDurationBeats } from '../music/piece';
import { useDuetStore } from './useDuetStore';

beforeEach(() => {
  useDuetStore.getState().resetDemo();
  transport.setLoop({ enabled: false });
  transport.setMetronome({ enabled: false, subdivision: 1, level: 0.5 });
  transport.setMix({ left: 'on', right: 'on' });
  transport.setCountInBars(0);
});

describe('pieces', () => {
  it('starts on the seeded piece', () => {
    expect(useDuetStore.getState().piece.id).toBe('fur-elise');
  });

  it('loads a library piece by id', () => {
    const result = useDuetStore.getState().loadPiece({ pieceId: 'minuet-in-g' }, 'human');
    expect(result.ok).toBe(true);
    expect(useDuetStore.getState().piece.title).toBe('Minuet in G');
  });

  it('rejects an unknown piece id and lists what exists', () => {
    const result = useDuetStore.getState().loadPiece({ pieceId: 'nope' }, 'agent');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_PIECE');
      expect(result.error.message).toContain('fur-elise');
    }
  });
});

describe('transforms', () => {
  it('applies transforms to the original, so they do not stack', () => {
    const store = useDuetStore.getState();
    const original = store.piece.bpm;
    store.transform({ tempoScale: 0.5 }, 'agent');
    expect(useDuetStore.getState().piece.bpm).toBe(Math.round(original * 0.5));
    useDuetStore.getState().transform({ tempoScale: 0.5 }, 'agent');
    expect(useDuetStore.getState().piece.bpm).toBe(Math.round(original * 0.5));
  });

  it('isolates a hand', () => {
    useDuetStore.getState().transform({ hands: ['right'] }, 'agent');
    expect(useDuetStore.getState().piece.notes.every((note) => note.hand === 'right')).toBe(true);
  });

  it('refuses a hand the piece does not have', () => {
    useDuetStore.getState().loadPiece({ pieceId: 'c-major-scale' }, 'human');
    const result = useDuetStore.getState().transform({ hands: ['left'] }, 'agent');
    expect(result.ok).toBe(false);
  });

  it('requires at least one change', () => {
    expect(useDuetStore.getState().transform({}, 'agent').ok).toBe(false);
  });
});

describe('transport controls', () => {
  it('sets and clears a loop', () => {
    const set = useDuetStore.getState().setLoop({ enabled: true, fromBar: 1, toBar: 3 }, 'agent');
    expect(set.ok).toBe(true);
    expect(transport.loop.enabled).toBe(true);
    const cleared = useDuetStore.getState().setLoop({ enabled: false }, 'agent');
    expect(cleared.ok).toBe(true);
    expect(transport.loop.enabled).toBe(false);
  });

  it('rejects a reversed or out of range loop', () => {
    const reversed = useDuetStore.getState().setLoop({ fromBar: 4, toBar: 2 }, 'agent');
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.error.code).toBe('LOOP_INVALID');

    const past = useDuetStore.getState().setLoop({ fromBar: 1, toBar: 999 }, 'agent');
    expect(past.ok).toBe(false);
  });

  it('seeks by bar and clamps refusals', () => {
    const ok = useDuetStore.getState().seekTo({ bar: 2 }, 'agent');
    expect(ok.ok).toBe(true);

    const bad = useDuetStore.getState().seekTo({ bar: 500 }, 'agent');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('POSITION_INVALID');
  });

  it('limits count-in to zero, one or two bars', () => {
    expect(useDuetStore.getState().setCountIn(2, 'agent').ok).toBe(true);
    expect(transport.getCountInBars()).toBe(2);
    expect(useDuetStore.getState().setCountIn(5, 'agent').ok).toBe(false);
  });

  it('mutes one hand but never both', () => {
    expect(useDuetStore.getState().setMix({ left: 'muted' }, 'agent').ok).toBe(true);
    const both = useDuetStore.getState().setMix({ right: 'muted' }, 'agent');
    expect(both.ok).toBe(false);
    expect(transport.mix.left).toBe('on');
    expect(transport.mix.right).toBe('on');
  });

  it('reports transport state including tempo percentage', () => {
    useDuetStore.getState().transform({ tempoScale: 0.7 }, 'agent');
    const result = useDuetStore.getState().readTransport();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.percentOfOriginal).toBe(70);
      expect(result.data.status).toBe('stopped');
    }
  });

  it('refuses to pause when nothing is playing', () => {
    expect(useDuetStore.getState().pausePlayback('agent').ok).toBe(false);
  });

  it('refuses to resume when nothing is paused', () => {
    expect(useDuetStore.getState().resumePlayback('agent').ok).toBe(false);
  });

  it('reports audio as locked rather than pretending to play', () => {
    const result = useDuetStore.getState().playPiece(undefined, 'agent');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('AUDIO_LOCKED');
  });
});

describe('score reading', () => {
  it('pages through notes and reports a cursor', () => {
    useDuetStore.getState().loadPiece({ pieceId: 'canon-in-d' }, 'human');
    const first = useDuetStore.getState().readScore(undefined, undefined, 0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect((first.data.notes as unknown[]).length).toBeLessThanOrEqual(60);

    const total = first.data.totalNotes as number;
    if (total > 60) {
      expect(first.data.nextCursor).toBe(60);
      const second = useDuetStore.getState().readScore(undefined, undefined, 60);
      expect(second.ok).toBe(true);
    }
  });

  it('narrows to a bar range', () => {
    const result = useDuetStore.getState().readScore(1, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const note of result.data.notes as { bar: number }[]) {
        expect(note.bar).toBeLessThanOrEqual(2);
      }
    }
  });

  it('rejects a cursor past the end', () => {
    const result = useDuetStore.getState().readScore(undefined, undefined, 99999);
    expect(result.ok).toBe(false);
  });
});

describe('modes and practice', () => {
  it('demo mode leaves practice off', () => {
    useDuetStore.getState().setMode('demo', 'human');
    expect(useDuetStore.getState().practice.active).toBe(false);
  });

  it('practice mode arms the expected keys', () => {
    useDuetStore.getState().setMode('practice', 'human');
    const practice = useDuetStore.getState().practice;
    expect(practice.active).toBe(true);
    expect(practice.expected.length).toBeGreaterThan(0);
  });

  it('a correct key advances practice and a wrong key counts a miss', () => {
    useDuetStore.getState().setMode('practice', 'human');
    const expected = useDuetStore.getState().practice.expected;
    useDuetStore.getState().pressKey(expected[0]);
    expect(useDuetStore.getState().practice.hits).toBeGreaterThan(0);

    const before = useDuetStore.getState().practice.misses;
    useDuetStore.getState().pressKey(1);
    expect(useDuetStore.getState().practice.misses).toBe(before + 1);
  });

  it('play along advances on any key', () => {
    useDuetStore.getState().setMode('playalong', 'human');
    const index = useDuetStore.getState().practice.index;
    useDuetStore.getState().pressKey(1);
    expect(useDuetStore.getState().practice.index).toBe(index + 1);
  });
});

describe('keyboard range', () => {
  it('auto keeps the melody inside the visible window', () => {
    for (const id of ['fur-elise', 'minuet-in-g', 'twinkle', 'mountain-king']) {
      useDuetStore.getState().loadPiece({ pieceId: id }, 'human');
      const { visibleRange, piece } = useDuetStore.getState();
      const right = piece.notes.filter((note) => note.hand === 'right');
      const visible = right.filter(
        (note) => note.midi >= visibleRange.from && note.midi <= visibleRange.to,
      );
      expect(visible.length / right.length, id).toBeGreaterThan(0.85);
    }
  });

  it('full mode shows all 88 keys', () => {
    useDuetStore.getState().setRangeMode('full');
    expect(useDuetStore.getState().visibleRange).toEqual({ from: 21, to: 108 });
  });
});

describe('activity log', () => {
  it('separates agent actions from human actions', () => {
    useDuetStore.getState().loadPiece({ pieceId: 'twinkle' }, 'agent');
    useDuetStore.getState().setCountIn(1, 'human');
    const activity = useDuetStore.getState().activity;
    expect(activity.some((entry) => entry.source === 'agent')).toBe(true);
    expect(activity.some((entry) => entry.source === 'human')).toBe(true);
  });
});

describe('long scores', () => {
  it('handles a dense piece without pathological growth', () => {
    const base = libraryPiece('canon-in-d')!;
    const notes = [];
    for (let bar = 0; bar < 250; bar += 1) {
      for (let i = 0; i < 8; i += 1) {
        notes.push({
          midi: 48 + ((bar + i) % 24),
          startBeat: bar * 4 + i * 0.5,
          durationBeats: 0.5,
          velocity: 0.7,
          hand: (i % 2 === 0 ? 'right' : 'left') as 'right' | 'left',
        });
      }
    }
    const big = { ...base, id: 'big', title: 'Stress', notes };
    const started = Date.now();
    const result = useDuetStore.getState().loadPiece({ piece: big }, 'agent');
    expect(result.ok).toBe(true);
    expect(pieceDurationBeats(useDuetStore.getState().piece)).toBeGreaterThan(900);
    expect(Date.now() - started).toBeLessThan(1500);

    const page = useDuetStore.getState().readScore();
    expect(page.ok).toBe(true);
    if (page.ok) {
      expect((page.data.notes as unknown[]).length).toBe(12);
      expect(page.data.nextCursor).toBe(12);
      expect(JSON.stringify(page).length).toBeLessThan(1500);
    }
  });
});
