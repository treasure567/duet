import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { transport } from '../audio/transport';
import { useDuetStore } from '../store/useDuetStore';
import {
  installMockModelContext,
  removeModelContext,
  type MockModelContext,
} from '../test/webmcp-harness';
import { DuetTools } from './DuetTools';

const EXPECTED = [
  'duet.get_capabilities',
  'duet.read_transport',
  'duet.read_score',
  'duet.pause',
  'duet.resume',
  'duet.seek',
  'duet.set_loop',
  'duet.set_metronome',
  'duet.set_count_in',
  'duet.set_mix',
  'duet.get_state',
  'duet.play_notes',
  'duet.load_piece',
  'duet.play_piece',
  'duet.stop',
  'duet.transform_piece',
  'duet.highlight_keys',
  'duet.listen',
  'duet.stop_listening',
  'duet.read_phrase',
  'duet.start_practice',
];

const READ_ONLY = new Set([
  'duet.get_capabilities',
  'duet.read_transport',
  'duet.read_score',
  'duet.get_state',
  'duet.read_phrase',
]);

let mock: MockModelContext;

beforeEach(async () => {
  useDuetStore.getState().resetDemo();
  transport.setLoop({ enabled: false });
  transport.setMix({ left: 'on', right: 'on' });
  transport.setCountInBars(0);
  mock = installMockModelContext();
});

afterEach(() => removeModelContext());

async function mountTools() {
  const view = render(<DuetTools />);
  await waitFor(() => expect(mock.names().length).toBe(EXPECTED.length));
  return view;
}

describe('registration', () => {
  it('registers every documented tool', async () => {
    await mountTools();
    expect(mock.names().sort()).toEqual([...EXPECTED].sort());
  });

  it('keeps names short and namespaced', async () => {
    await mountTools();
    for (const name of mock.names()) {
      expect(name.startsWith('duet.')).toBe(true);
      expect(name.length).toBeLessThan(30);
    }
  });

  it('annotates read tools accurately', async () => {
    await mountTools();
    for (const [name, tool] of mock.registry) {
      expect(tool.annotations?.readOnlyHint, name).toBe(READ_ONLY.has(name));
    }
  });

  it('describes side effects on every mutating tool', async () => {
    await mountTools();
    for (const [name, tool] of mock.registry) {
      if (READ_ONLY.has(name)) continue;
      expect(tool.description.toLowerCase(), name).toContain('side effects');
    }
  });

  it('uses strict schemas', async () => {
    await mountTools();
    for (const [name, tool] of mock.registry) {
      expect(tool.inputSchema?.additionalProperties, name).toBe(false);
    }
  });

  it('keeps descriptions within budget', async () => {
    await mountTools();
    for (const [name, tool] of mock.registry) {
      expect(tool.description.length, name).toBeLessThan(500);
    }
  });

  it('unregisters on unmount', async () => {
    const view = await mountTools();
    view.unmount();
    await waitFor(() => expect(mock.names()).toHaveLength(0));
  });

  it('survives a browser with no modelContext', () => {
    removeModelContext();
    expect(() => render(<DuetTools />)).not.toThrow();
  });
});

describe('behaviour', () => {
  it('capabilities advertise the transport surface', async () => {
    await mountTools();
    const result = await mock.call('duet.get_capabilities');
    const features = (result.data as { transport: string[] }).transport;
    for (const feature of ['loop', 'count_in', 'metronome', 'seek', 'mix']) {
      expect(features).toContain(feature);
    }
  });

  it('reads live store state, not a stale closure', async () => {
    await mountTools();
    useDuetStore.getState().loadPiece({ pieceId: 'twinkle' }, 'human');
    const result = await mock.call('duet.get_state');
    expect((result.data as { piece: { title: string } }).piece.title).toContain('Twinkle');
  });

  it('rejects unknown arguments', async () => {
    await mountTools();
    const result = await mock.call('duet.set_loop', { nope: 1 });
    expect(result.ok).toBe(false);
    expect((result.error as { code: string }).code).toBe('INVALID_INPUT');
  });

  it('rejects a note outside the piano', async () => {
    await mountTools();
    const result = await mock.call('duet.play_notes', {
      notes: [{ note: 'C9', start: 0, duration: 1 }],
    });
    expect(result.ok).toBe(false);
  });

  it('refuses an invalid loop with a stable code', async () => {
    await mountTools();
    const result = await mock.call('duet.set_loop', { fromBar: 9, toBar: 2 });
    expect((result.error as { code: string }).code).toBe('LOOP_INVALID');
  });

  it('refuses a position past the end', async () => {
    await mountTools();
    const result = await mock.call('duet.seek', { bar: 400 });
    expect((result.error as { code: string }).code).toBe('POSITION_INVALID');
  });

  it('never mutes both hands', async () => {
    await mountTools();
    await mock.call('duet.set_mix', { left: 'muted' });
    const result = await mock.call('duet.set_mix', { right: 'muted' });
    expect(result.ok).toBe(false);
    expect(transport.mix.right).toBe('on');
  });

  it('reports audio as locked rather than silently failing', async () => {
    await mountTools();
    const result = await mock.call('duet.play_piece');
    expect((result.error as { code: string }).code).toBe('AUDIO_LOCKED');
  });

  it('pages the score instead of truncating it', async () => {
    await mountTools();
    const first = await mock.call('duet.read_score');
    expect(first.ok).toBe(true);
    const data = first.data as { notes: unknown[]; nextCursor: number | null; totalNotes: number };
    expect(data.notes.length).toBeGreaterThan(0);
    expect(data.notes.length).toBeLessThanOrEqual(12);
    expect(data.nextCursor).toBe(data.totalNotes > data.notes.length ? data.notes.length : null);
    expect((first.data as { omitted?: boolean }).omitted).not.toBe(true);
  });

  it('keeps every result within the response budget', async () => {
    await mountTools();
    const payloads = [
      await mock.call('duet.get_capabilities'),
      await mock.call('duet.get_state'),
      await mock.call('duet.read_transport'),
      await mock.call('duet.read_score'),
      await mock.call('duet.set_loop', { enabled: true, fromBar: 1, toBar: 2 }),
    ];
    for (const payload of payloads) {
      expect(JSON.stringify(payload).length).toBeLessThan(1500);
    }
  });

  it('records agent actions separately in the activity log', async () => {
    await mountTools();
    await mock.call('duet.set_count_in', { bars: 1 });
    expect(useDuetStore.getState().activity.some((entry) => entry.source === 'agent')).toBe(true);
  });

  it('an agent can complete the loop-a-phrase-at-70-percent journey', async () => {
    await mountTools();
    expect((await mock.call('duet.load_piece', { pieceId: 'minuet-in-g' })).ok).toBe(true);
    expect((await mock.call('duet.transform_piece', { hands: ['right'], tempoScale: 0.7 })).ok).toBe(
      true,
    );
    expect((await mock.call('duet.set_loop', { enabled: true, fromBar: 1, toBar: 4 })).ok).toBe(true);
    expect((await mock.call('duet.set_count_in', { bars: 1 })).ok).toBe(true);
    expect((await mock.call('duet.set_metronome', { enabled: true })).ok).toBe(true);

    const state = await mock.call('duet.read_transport');
    const data = state.data as {
      percentOfOriginal: number;
      loop: { enabled: boolean; fromBar: number; toBar: number };
      countInBars: number;
    };
    expect(data.percentOfOriginal).toBe(70);
    expect(data.loop).toEqual({ enabled: true, fromBar: 1, toBar: 4 });
    expect(data.countInBars).toBe(1);

    expect((await mock.call('duet.start_practice')).ok).toBe(true);
    expect(useDuetStore.getState().practice.active).toBe(true);
  });
});
