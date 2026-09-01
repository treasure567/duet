import { useFirstGestureUnlock } from '../audio/useFirstGestureUnlock';
import { Keyboard } from '../components/keyboard/Keyboard';
import { Rail } from '../components/shell/Rail';
import { TopBar } from '../components/shell/TopBar';
import { TransportBar } from '../components/shell/TransportBar';
import { useDuetStore } from '../store/useDuetStore';
import { DuetTools } from '../webmcp/DuetTools';

function HighlightLabel() {
  const highlight = useDuetStore((state) => state.highlight);
  const clearHighlight = useDuetStore((state) => state.clearHighlight);
  if (!highlight) return null;

  return (
    <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber/40 bg-stage/90 px-3 py-1.5 text-[11px] text-amber backdrop-blur">
      {highlight.label}
      <button
        type="button"
        onClick={clearHighlight}
        className="ml-2 text-muted transition hover:text-ink"
        aria-label="Clear highlight"
      >
        ×
      </button>
    </div>
  );
}

export function App() {
  useFirstGestureUnlock();

  return (
    <>
      <DuetTools />
      <div className="flex h-full min-h-0 flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col bg-[#0a0c0e]">
            <div className="relative min-h-0 flex-1">
              <HighlightLabel />
            </div>
            <TransportBar />
            <div className="h-[44%] max-h-[290px] min-h-[180px] shrink-0">
              <Keyboard />
            </div>
          </main>
          <Rail />
        </div>
      </div>
    </>
  );
}
