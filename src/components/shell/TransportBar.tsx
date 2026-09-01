import { useEffect, useState } from 'react';
import { Repeat, Timer, Volume2 } from 'lucide-react';
import { transport } from '../../audio/transport';
import { pieceDurationBeats } from '../../music/piece';
import { useDuetStore } from '../../store/useDuetStore';

function Chip({
  active,
  onClick,
  children,
  title,
  testId,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      data-testid={testId}
      className={`num inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition ${
        active
          ? 'border-[#3ddc97]/50 bg-[#3ddc97]/12 text-[#3ddc97]'
          : 'border-[#2a2f35] text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export function TransportBar() {
  const piece = useDuetStore((state) => state.piece);
  const originalPiece = useDuetStore((state) => state.originalPiece);
  const transform = useDuetStore((state) => state.transform);
  const seekTo = useDuetStore((state) => state.seekTo);
  const setLoop = useDuetStore((state) => state.setLoop);
  const setMetronome = useDuetStore((state) => state.setMetronome);
  const setCountIn = useDuetStore((state) => state.setCountIn);
  const setMix = useDuetStore((state) => state.setMix);
  const rangeMode = useDuetStore((state) => state.rangeMode);
  const setRangeMode = useDuetStore((state) => state.setRangeMode);

  const [bar, setBar] = useState(1);
  const [, force] = useState(0);

  const totalBars = Math.max(1, Math.ceil(pieceDurationBeats(piece) / piece.beatsPerBar));

  useEffect(() => transport.subscribe(() => force((n) => n + 1)), []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const beat = transport.positionBeats();
      setBar(Math.min(totalBars, Math.floor(beat / piece.beatsPerBar) + 1));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [piece.beatsPerBar, totalBars]);

  const percent = Math.round((piece.bpm / originalPiece.bpm) * 100);
  const loop = transport.loop;
  const metronome = transport.metronome;
  const mix = transport.mix;
  const countIn = transport.getCountInBars();

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#20242a] bg-[#15181c] px-4 py-2">
      <span className="num w-[86px] shrink-0 text-[11px] text-muted">
        bar <span className="text-ink">{bar}</span> / {totalBars}
      </span>

      <input
        type="range"
        min={1}
        max={totalBars}
        step={1}
        value={bar}
        aria-label="Playhead position in bars"
        data-testid="scrubber"
        onChange={(event) => seekTo({ bar: Number(event.target.value) }, 'human')}
        className="h-1 min-w-[120px] flex-1 accent-[#3ddc97]"
      />

      <Chip
        active={loop.enabled}
        testId="loop-toggle"
        title="Loop four bars from the playhead"
        onClick={() =>
          loop.enabled
            ? setLoop({ enabled: false }, 'human')
            : setLoop(
                { enabled: true, fromBar: bar, toBar: Math.min(totalBars, bar + 3) },
                'human',
              )
        }
      >
        <Repeat size={11} />
        {loop.enabled
          ? `${Math.floor(loop.startBeat / piece.beatsPerBar) + 1}–${Math.ceil(loop.endBeat / piece.beatsPerBar)}`
          : 'Loop'}
      </Chip>

      <Chip
        active={metronome.enabled}
        testId="metronome-toggle"
        title="Metronome"
        onClick={() => setMetronome({ enabled: !metronome.enabled }, 'human')}
      >
        <Timer size={11} /> Click
      </Chip>

      <Chip
        active={countIn > 0}
        testId="countin-toggle"
        title="Bars of count-in before playing"
        onClick={() => setCountIn((countIn + 1) % 3, 'human')}
      >
        Count {countIn}
      </Chip>

      <div className="flex items-center gap-1">
        <span className="num text-[10px] text-muted">tempo</span>
        <input
          type="range"
          min={40}
          max={140}
          step={5}
          value={Math.min(140, Math.max(40, percent))}
          aria-label="Tempo as a percentage of the original"
          data-testid="tempo-slider"
          onChange={(event) =>
            transform({ tempoScale: Number(event.target.value) / 100 }, 'human')
          }
          className="h-1 w-[86px] accent-[#3ddc97]"
        />
        <span className="num w-[34px] text-[10px] text-ink">{percent}%</span>
      </div>

      <div className="flex items-center gap-1">
        <Volume2 size={11} className="text-muted" aria-hidden />
        <Chip
          active={mix.left === 'on'}
          testId="mix-left"
          title="Left hand"
          onClick={() => setMix({ left: mix.left === 'on' ? 'muted' : 'on' }, 'human')}
        >
          L
        </Chip>
        <Chip
          active={mix.right === 'on'}
          testId="mix-right"
          title="Right hand"
          onClick={() => setMix({ right: mix.right === 'on' ? 'muted' : 'on' }, 'human')}
        >
          R
        </Chip>
      </div>

      <label className="flex items-center gap-1">
        <span className="num text-[10px] text-muted">keys</span>
        <select
          value={rangeMode}
          onChange={(event) => setRangeMode(event.target.value as typeof rangeMode)}
          aria-label="Keyboard range mode"
          data-testid="range-mode"
          className="num rounded-md border border-[#2a2f35] bg-[#0f1216] px-1.5 py-1 text-[10px] text-ink"
        >
          <option value="auto">auto</option>
          <option value="follow">follow</option>
          <option value="manual">manual</option>
          <option value="full">full 88</option>
        </select>
      </label>
    </div>
  );
}
