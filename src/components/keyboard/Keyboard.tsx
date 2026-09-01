import { useEffect, useMemo, useRef } from 'react';
import { transport } from '../../audio/transport';
import { midiToName } from '../../music/notes';
import { useDuetStore } from '../../store/useDuetStore';
import { buildKeyboardLayout } from './layout';
import { buildQwertyMap, invertQwertyMap } from './qwerty';

export function Keyboard() {
  const range = useDuetStore((state) => state.visibleRange);
  const labelMode = useDuetStore((state) => state.labelMode);
  const pressKey = useDuetStore((state) => state.pressKey);
  const highlight = useDuetStore((state) => state.highlight);
  const practice = useDuetStore((state) => state.practice);

  const { keys } = useMemo(
    () => buildKeyboardLayout(range.from, range.to),
    [range.from, range.to],
  );
  const qwerty = useMemo(
    () => buildQwertyMap(range.from, range.to),
    [range.from, range.to],
  );
  const refs = useRef(new Map<number, HTMLButtonElement>());

  const highlightSet = useMemo(() => new Set(highlight?.midi ?? []), [highlight]);
  const expectedSet = useMemo(
    () => new Set(practice.active ? practice.expected : []),
    [practice.active, practice.expected],
  );

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const active = transport.activeMidi();
      for (const [midi, element] of refs.current) {
        const isActive = active.has(midi);
        if (element.dataset.active !== String(isActive)) {
          element.dataset.active = String(isActive);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const lookup = invertQwertyMap(qwerty);
    const held = new Set<string>();
    const down = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const key = event.key.toLowerCase();
      const midi = lookup.get(key);
      if (midi === undefined || held.has(key)) return;
      held.add(key);
      event.preventDefault();
      pressKey(midi);
    };
    const up = (event: KeyboardEvent) => held.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [qwerty, pressKey]);

  const whiteKeys = keys.filter((key) => !key.black);
  const blackKeys = keys.filter((key) => key.black);

  const labelFor = (midi: number) =>
    labelMode === 'qwerty' ? (qwerty.get(midi)?.toUpperCase() ?? '') : midiToName(midi);

  return (
    <div className="flex h-full flex-col">
      <div className="piano-felt h-[6px] shrink-0" />
      <div className="piano-case relative min-h-0 flex-1" role="group" aria-label="Piano keyboard">
        <div className="relative h-full">
          {whiteKeys.map((key) => (
            <button
              key={key.midi}
              ref={(element) => {
                if (element) refs.current.set(key.midi, element);
                else refs.current.delete(key.midi);
              }}
              type="button"
              aria-label={midiToName(key.midi)}
              data-midi={key.midi}
              onPointerDown={() => pressKey(key.midi)}
              data-active="false"
              data-highlight={highlightSet.has(key.midi)}
              data-expected={expectedSet.has(key.midi)}
              className="key-white absolute top-0 flex h-full flex-col items-center justify-end pb-3"
              style={{ left: `${key.left}%`, width: `${key.width}%` }}
            >
              {key.midi === 60 && (
                <span className="mb-1 size-[5px] rounded-full bg-[#c0392b]" aria-hidden />
              )}
              <span className="white-label">{labelFor(key.midi)}</span>
            </button>
          ))}

          {blackKeys.map((key) => (
            <button
              key={key.midi}
              ref={(element) => {
                if (element) refs.current.set(key.midi, element);
                else refs.current.delete(key.midi);
              }}
              type="button"
              aria-label={midiToName(key.midi)}
              data-midi={key.midi}
              onPointerDown={() => pressKey(key.midi)}
              data-active="false"
              data-highlight={highlightSet.has(key.midi)}
              data-expected={expectedSet.has(key.midi)}
              className="key-black absolute top-0 z-10 flex h-[62%] items-start justify-center pt-2"
              style={{ left: `${key.left}%`, width: `${key.width}%` }}
            >
              <span className="black-label">{labelFor(key.midi)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
