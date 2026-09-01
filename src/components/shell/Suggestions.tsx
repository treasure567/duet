import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { transport } from '../../audio/transport';
import { useDuetStore } from '../../store/useDuetStore';

export function buildSuggestions(state: {
  title: string;
  mode: string;
  hasPhrase: boolean;
  looping: boolean;
  percent: number;
  practising: boolean;
}): string[] {
  if (state.hasPhrase) {
    return [
      'Play back what I just sang, then answer it with a phrase in the same key.',
      'Harmonise the phrase I sang and play both parts together.',
      'Turn what I sang into a short piece and load it.',
    ];
  }

  if (state.practising) {
    return [
      'Slow this loop to 60 percent and give me a one bar count-in.',
      'Mute the left hand so I can practise the melody on its own.',
      'Loop just the two bars I keep missing.',
    ];
  }

  if (state.looping) {
    return [
      `Play the loop at 60 percent with the metronome on.`,
      'Widen the loop by two bars and start practice mode.',
      'Turn the loop off and play the whole piece.',
    ];
  }

  return [
    `Play ${state.title}, then slow it to 70 percent and keep only the right hand.`,
    `Loop the first four bars of ${state.title} with a count-in so I can learn them.`,
    'Highlight the notes of the opening phrase, then play it one hand at a time.',
    'Listen to me sing a phrase and answer it on the piano.',
  ];
}

export function Suggestions() {
  const piece = useDuetStore((state) => state.piece);
  const mode = useDuetStore((state) => state.mode);
  const lastPhrase = useDuetStore((state) => state.lastPhrase);
  const practice = useDuetStore((state) => state.practice);
  const originalPiece = useDuetStore((state) => state.originalPiece);
  const [copied, setCopied] = useState<number | null>(null);

  const suggestions = buildSuggestions({
    title: piece.title,
    mode,
    hasPhrase: Boolean(lastPhrase && lastPhrase.length > 0),
    looping: transport.loop.enabled,
    percent: Math.round((piece.bpm / originalPiece.bpm) * 100),
    practising: practice.active,
  });

  const copy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section className="panel px-3.5 py-3" data-testid="suggestions">
      <span className="tag text-muted">Say this to your agent</span>
      <ul className="mt-2 space-y-1.5">
        {suggestions.map((text, index) => (
          <li key={text}>
            <button
              type="button"
              onClick={() => copy(text, index)}
              className="group flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition hover:border-[#2a2f35] hover:bg-[#0f1216]"
            >
              <span className="mt-0.5 shrink-0 text-muted group-hover:text-ink">
                {copied === index ? <Check size={11} /> : <Copy size={11} />}
              </span>
              <span className="text-[12px] leading-relaxed">{text}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
