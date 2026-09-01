import { LIBRARY } from '../../data/library';
import { useDuetStore } from '../../store/useDuetStore';
import { SingPanel } from './SingPanel';
import { Suggestions } from './Suggestions';

function LibraryPanel() {
  const loadPiece = useDuetStore((state) => state.loadPiece);
  const piece = useDuetStore((state) => state.piece);

  return (
    <section className="panel px-3.5 py-3">
      <span className="tag text-muted">Library</span>
      <ul className="mt-2 space-y-1">
        {LIBRARY.map((entry) => {
          const current = entry.title === piece.title;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => loadPiece({ pieceId: entry.id }, 'human')}
                aria-pressed={current}
                className={`w-full rounded-md border px-2.5 py-1.5 text-left transition ${
                  current
                    ? 'border-amber/45 bg-amber/8'
                    : 'border-transparent hover:border-line hover:bg-stage'
                }`}
              >
                <span className="block truncate text-[12px]">{entry.title}</span>
                <span className="num block text-[10px] text-muted">
                  {entry.composer} · {Math.round(entry.bpm)} bpm
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Public domain. Your agent can also send its own arrangement, note by note.
      </p>
    </section>
  );
}

function ActivityPanel() {
  const activity = useDuetStore((state) => state.activity);

  return (
    <section className="panel px-3.5 py-3">
      <span className="tag text-muted">Activity</span>
      {activity.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted">
          Every move, yours and your agent&rsquo;s, is logged here.
        </p>
      ) : (
        <ol className="scroll-thin mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {activity.slice(0, 20).map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 text-[11px]">
              <span
                className={`mt-px shrink-0 rounded px-1 py-0.5 text-[9px] tracking-wide uppercase ${
                  entry.source === 'agent'
                    ? 'bg-amber/15 text-amber'
                    : entry.source === 'human'
                      ? 'bg-slate/20 text-slate'
                      : 'bg-line text-muted'
                }`}
              >
                {entry.source === 'agent' ? 'agent' : entry.source === 'human' ? 'you' : 'sys'}
              </span>
              <span className="min-w-0 flex-1 text-muted">{entry.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PracticePanel() {
  const practice = useDuetStore((state) => state.practice);
  const stopPractice = useDuetStore((state) => state.stopPractice);
  if (!practice.active) return null;

  return (
    <section className="panel border-amber/35 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="tag text-amber">Practice</span>
        <button
          type="button"
          onClick={stopPractice}
          className="text-[11px] text-muted transition hover:text-ink"
        >
          End
        </button>
      </div>
      <p className="num mt-2 text-[12px]">
        step {practice.index + 1} · {practice.hits} hit · {practice.misses} missed
      </p>
      <p className="mt-1 text-[11px] text-muted">
        The keys you need are tinted green. Play them to move on.
      </p>
    </section>
  );
}

export function Rail() {
  return (
    <div className="scroll-thin flex min-h-0 w-[320px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-line bg-stage p-3">
      <Suggestions />
      <PracticePanel />
      <SingPanel />
      <LibraryPanel />
      <ActivityPanel />
    </div>
  );
}
