import { useEffect } from 'react';
import { useDuetStore } from '../store/useDuetStore';

const EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];

export function useFirstGestureUnlock(): void {
  const audioReady = useDuetStore((state) => state.audioReady);
  const unlockAudio = useDuetStore((state) => state.unlockAudio);

  useEffect(() => {
    if (audioReady) return;
    let done = false;
    const handler = () => {
      if (done) return;
      done = true;
      void unlockAudio('system');
    };
    for (const event of EVENTS) window.addEventListener(event, handler, { once: true });
    return () => {
      for (const event of EVENTS) window.removeEventListener(event, handler);
    };
  }, [audioReady, unlockAudio]);
}
