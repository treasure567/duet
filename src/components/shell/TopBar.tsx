import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { transport } from '../../audio/transport';
import { useDuetStore, type PlayMode } from '../../store/useDuetStore';
import { NoteStrip } from './NoteStrip';

const MODES: { id: PlayMode; label: string }[] = [
  { id: 'demo', label: 'Demo' },
  { id: 'playalong', label: 'Play Along' },
  { id: 'practice', label: 'Practice' },
];

export function TopBar() {
  const piece = useDuetStore((state) => state.piece);
  const mode = useDuetStore((state) => state.mode);
  const setMode = useDuetStore((state) => state.setMode);
  const labelMode = useDuetStore((state) => state.labelMode);
  const setLabelMode = useDuetStore((state) => state.setLabelMode);
  const audioReady = useDuetStore((state) => state.audioReady);
  const unlockAudio = useDuetStore((state) => state.unlockAudio);
  const playPiece = useDuetStore((state) => state.playPiece);
  const appendActivity = useDuetStore((state) => state.appendActivity);
  const supported = useDuetStore((state) => state.webmcpSupported);
  const toolCount = useDuetStore((state) => state.webmcpToolCount);
  const [playing, setPlaying] = useState(false);

  useEffect(() => transport.subscribe(() => setPlaying(transport.isPlaying)), []);

  const live = supported && toolCount > 0;

  const toggle = async () => {
    if (!audioReady) {
      const ready = await unlockAudio('human');
      if (!ready) return;
    }
    if (transport.isPlaying) {
      const beat = transport.pause();
      appendActivity('human', 'pause', `Paused at beat ${beat.toFixed(1)}.`);
      return;
    }
    if (transport.resume()) {
      appendActivity('human', 'resume', 'Resumed.');
      return;
    }
    playPiece(undefined, 'human');
  };

  const restart = async () => {
    if (!audioReady) await unlockAudio('human');
    transport.stop();
    playPiece(undefined, 'human');
  };

  return (
    <header className="shrink-0 border-b border-[#20242a] bg-[#15181c]">
      <div className="flex items-center gap-4 px-4 py-2.5">
        <div className="flex w-[180px] shrink-0 items-center gap-2">
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
            <rect x="1" y="3" width="16" height="12" rx="1.5" fill="none" stroke="#e9e7e3" />
            <rect x="4.4" y="3" width="1.3" height="7" fill="#e9e7e3" />
            <rect x="8.4" y="3" width="1.3" height="7" fill="#e9e7e3" />
            <rect x="12.4" y="3" width="1.3" height="7" fill="#e9e7e3" />
          </svg>
          <span className="text-[13px] font-semibold tracking-tight">Duet</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggle}
            data-testid="play-toggle"
            aria-label={playing ? 'Pause' : 'Play'}
            className="inline-flex size-7 items-center justify-center rounded-md border border-[#2a2f35] text-ink transition hover:bg-white/5"
          >
            {playing ? <Pause size={13} /> : <Play size={13} className="ml-px" />}
          </button>
          <button
            type="button"
            onClick={restart}
            aria-label="Restart"
            className="inline-flex size-7 items-center justify-center rounded-md border border-[#2a2f35] text-muted transition hover:bg-white/5 hover:text-ink"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 rounded-full bg-[#0f1216] p-0.5">
          {MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setMode(entry.id, 'human')}
              aria-pressed={mode === entry.id}
              data-testid={`mode-${entry.id}`}
              className={`rounded-full px-3.5 py-1 text-[12px] transition ${
                mode === entry.id
                  ? 'bg-[#2e9e6b] font-medium text-white'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-medium">{piece.title}</p>
          <p className="num truncate text-[10px] text-muted">
            {piece.composer} · {Math.round(piece.bpm)} bpm
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md bg-[#0f1216] p-0.5">
            {(['qwerty', 'notes'] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setLabelMode(entry)}
                aria-pressed={labelMode === entry}
                data-testid={`label-${entry}`}
                className={`num rounded px-2 py-1 text-[10px] tracking-wider transition ${
                  labelMode === entry ? 'bg-[#2a2f35] text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {entry === 'qwerty' ? 'QWERTY' : 'CDE'}
              </button>
            ))}
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2f35] px-2.5 py-1 text-[10px]"
            data-testid="webmcp-status"
            role="status"
          >
            <span className={`size-1.5 rounded-full ${live ? 'bg-[#3ddc97]' : 'bg-muted/50'}`} />
            <span className={live ? 'text-ink' : 'text-muted'}>
              {live ? `${toolCount} tools` : 'idle'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2.5">
        <NoteStrip />
      </div>
    </header>
  );
}
