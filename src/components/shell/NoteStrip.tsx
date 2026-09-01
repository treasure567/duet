import { useEffect, useMemo, useRef } from 'react';
import { transport } from '../../audio/transport';
import { NOTE_NAMES_SHARP } from '../../music/notes';
import { buildQwertyMap } from '../keyboard/qwerty';
import { useDuetStore } from '../../store/useDuetStore';

const GROUP_WIDTH = 58;
const PLAYHEAD_RATIO = 0.32;

interface Group {
  beat: number;
  midis: number[];
}

export function NoteStrip() {
  const piece = useDuetStore((state) => state.piece);
  const practice = useDuetStore((state) => state.practice);
  const mode = useDuetStore((state) => state.mode);
  const labelMode = useDuetStore((state) => state.labelMode);
  const range = useDuetStore((state) => state.visibleRange);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const qwerty = useMemo(() => buildQwertyMap(range.from, range.to), [range.from, range.to]);

  const groups = useMemo<Group[]>(() => {
    const byBeat = new Map<number, number[]>();
    for (const note of piece.notes) {
      const key = Math.round(note.startBeat * 1000) / 1000;
      if (!byBeat.has(key)) byBeat.set(key, []);
      byBeat.get(key)!.push(note.midi);
    }
    return [...byBeat.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([beat, midis]) => ({ beat, midis: midis.sort((a, b) => b - a) }));
  }, [piece]);

  const stepIndexRef = useRef(0);
  stepIndexRef.current = mode === 'demo' ? 0 : practice.index;

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      const list = groupsRef.current;

      if (track && viewport && list.length > 0) {
        let position: number;

        if (transport.isPlaying) {
          const beat = transport.positionBeats();
          let index = list.findIndex((group) => group.beat > beat);
          if (index === -1) index = list.length;
          const previous = list[index - 1];
          const next = list[index];
          if (previous && next && next.beat > previous.beat) {
            const fraction = (beat - previous.beat) / (next.beat - previous.beat);
            position = index - 1 + Math.min(1, Math.max(0, fraction));
          } else {
            position = Math.max(0, index - 1);
          }
        } else {
          position = Math.max(0, stepIndexRef.current);
        }

        const offset = viewport.clientWidth * PLAYHEAD_RATIO - position * GROUP_WIDTH;
        track.style.transform = `translateX(${offset}px)`;

        const current = Math.round(position);
        for (const child of Array.from(track.children) as HTMLElement[]) {
          const index = Number(child.dataset.index);
          const state = index < current ? 'past' : index === current ? 'now' : 'next';
          if (child.dataset.state !== state) child.dataset.state = state;
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const labelFor = (midi: number) => {
    if (labelMode === 'qwerty') return qwerty.get(midi)?.toUpperCase() ?? '·';
    return NOTE_NAMES_SHARP[((midi % 12) + 12) % 12];
  };

  return (
    <div
      ref={viewportRef}
      className="relative h-[54px] overflow-hidden rounded-md bg-[#101317]"
      data-testid="note-strip"
    >
      <div
        className="absolute top-1 bottom-1 z-10 w-px bg-[#3ddc97]"
        style={{ left: `${PLAYHEAD_RATIO * 100}%` }}
        aria-hidden
      />
      <div ref={trackRef} className="absolute inset-y-0 left-0 flex will-change-transform">
        {groups.map((group, index) => (
          <div
            key={`${group.beat}-${index}`}
            data-index={index}
            data-state="next"
            data-testid="note-group"
            className="flex shrink-0 flex-col items-center justify-center gap-0 opacity-45 transition-opacity data-[state=now]:opacity-100 data-[state=past]:opacity-20"
            style={{ width: GROUP_WIDTH }}
          >
            {group.midis.slice(0, 3).map((midi) => (
              <span key={midi} className="num text-[13px] leading-[1.15] text-ink">
                {labelFor(midi)}
                {labelMode === 'notes' && (
                  <sub className="text-[9px] text-muted">{Math.floor(midi / 12) - 1}</sub>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
