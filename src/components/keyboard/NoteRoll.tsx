import { useEffect, useMemo, useRef } from 'react';
import { transport } from '../../audio/transport';
import { isBlackKey } from '../../music/notes';
import { useDuetStore } from '../../store/useDuetStore';
import { buildKeyboardLayout } from './layout';

const VISIBLE_BEATS = 9;

export function NoteRoll() {
  const piece = useDuetStore((state) => state.piece);
  const range = useDuetStore((state) => state.visibleRange);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieceRef = useRef(piece);
  pieceRef.current = piece;

  const layout = useMemo(() => {
    const { keys } = buildKeyboardLayout(range.from, range.to);
    return new Map(keys.map((key) => [key.midi, key]));
  }, [range.from, range.to]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      context.fillStyle = '#0b0d0f';
      context.fillRect(0, 0, width, height);

      for (const [midi, key] of layout) {
        if (isBlackKey(midi)) continue;
        if (midi % 12 !== 0) continue;
        context.fillStyle = 'rgba(255,255,255,0.045)';
        context.fillRect((key.left / 100) * width, 0, 1, height);
      }

      const current = pieceRef.current;
      const position = transport.isPlaying ? transport.positionBeats() : 0;
      const pixelsPerBeat = height / VISIBLE_BEATS;
      const lineY = height - 2;

      for (const note of current.notes) {
        const relative = note.startBeat - position;
        if (relative > VISIBLE_BEATS || relative + note.durationBeats < -0.5) continue;

        const key = layout.get(note.midi);
        if (!key) continue;

        const noteHeight = Math.max(4, note.durationBeats * pixelsPerBeat - 2);
        const y = lineY - relative * pixelsPerBeat - noteHeight;
        const x = (key.left / 100) * width + 1;
        const w = Math.max(2, (key.width / 100) * width - 2);

        const sounding = relative <= 0 && relative + note.durationBeats > 0;
        if (note.hand === 'left') {
          context.fillStyle = sounding ? '#a9bcc6' : 'rgba(124,139,148,0.72)';
        } else {
          context.fillStyle = sounding ? '#f0c16a' : 'rgba(217,164,65,0.82)';
        }

        const radius = Math.min(3, w / 2);
        context.beginPath();
        context.roundRect(x, y, w, noteHeight, radius);
        context.fill();
      }

      context.fillStyle = 'rgba(233,231,227,0.22)';
      context.fillRect(0, lineY, width, 1);

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [layout]);

  return <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />;
}
