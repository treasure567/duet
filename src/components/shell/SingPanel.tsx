import { useEffect, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { micListener } from '../../pitch/listener';
import { midiToName } from '../../music/notes';
import { useDuetStore } from '../../store/useDuetStore';

export function SingPanel() {
  const micState = useDuetStore((state) => state.micState);
  const startListening = useDuetStore((state) => state.startListening);
  const stopListening = useDuetStore((state) => state.stopListening);
  const lastPhrase = useDuetStore((state) => state.lastPhrase);
  const playNotes = useDuetStore((state) => state.playNotes);
  const piece = useDuetStore((state) => state.piece);
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    if (micState !== 'listening') {
      setLive(null);
      return;
    }
    const timer = window.setInterval(() => setLive(micListener.currentMidi), 60);
    return () => clearInterval(timer);
  }, [micState]);

  const listening = micState === 'listening';

  return (
    <section className="panel px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="tag text-muted">Sing to it</span>
        <button
          type="button"
          data-testid="sing-toggle"
          onClick={() => (listening ? stopListening('human') : startListening('human'))}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
            listening
              ? 'border-amber/60 bg-amber/10 text-amber'
              : 'border-line text-muted hover:text-ink'
          }`}
        >
          {listening ? <Square size={11} /> : <Mic size={11} />}
          {listening ? 'Stop' : 'Sing'}
        </button>
      </div>

      <div className="mt-2.5 flex h-9 items-center justify-center rounded-md border border-line bg-stage">
        {listening ? (
          <span className="num text-[15px] text-amber">
            {live === null ? '—' : midiToName(live)}
          </span>
        ) : (
          <span className="text-[11px] text-muted">
            {micState === 'denied' ? 'Microphone blocked' : 'Not listening'}
          </span>
        )}
      </div>

      {lastPhrase && lastPhrase.length > 0 && (
        <div className="mt-2.5">
          <p className="num text-[11px] break-words text-muted">
            {lastPhrase.map((note) => midiToName(note.midi)).join(' ')}
          </p>
          <button
            type="button"
            onClick={() => playNotes(lastPhrase, piece.bpm, 'Your phrase', 'human')}
            className="mt-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition hover:text-ink"
          >
            Play it back
          </button>
        </div>
      )}

      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        The page hears you and turns it into notes. Your agent reads those notes and answers on the
        piano.
      </p>
    </section>
  );
}
