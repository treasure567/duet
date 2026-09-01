import { beatsToSeconds, pieceDurationBeats, type Hand, type Note, type Piece } from '../music/piece';
import { pianoEngine } from './engine';

const LEAD_IN_SECONDS = 0.12;
const SCHEDULE_AHEAD_SECONDS = 0.35;
const TICK_MS = 25;
const MAX_SCHEDULED_NOTES = 4000;

type Listener = () => void;

export interface LoopState {
  enabled: boolean;
  startBeat: number;
  endBeat: number;
}

export interface MetronomeState {
  enabled: boolean;
  subdivision: number;
  level: number;
}

export interface MixState {
  left: 'on' | 'muted';
  right: 'on' | 'muted';
}

class Transport {
  private piece: Piece | null = null;
  private playing = false;
  private paused = false;
  private segmentStartTime = 0;
  private segmentStartBeat = 0;
  private scheduledPassEnd = -1;
  private pausedAtBeat: number | null = null;
  private timer: number | null = null;
  private listeners = new Set<Listener>();
  private manualNotes = new Map<number, number>();
  private countInBars = 0;
  private countInUntil = 0;

  loop: LoopState = { enabled: false, startBeat: 0, endBeat: 0 };
  metronome: MetronomeState = { enabled: false, subdivision: 1, level: 0.5 };
  mix: MixState = { left: 'on', right: 'on' };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get currentPiece(): Piece | null {
    return this.piece;
  }

  get inCountIn(): boolean {
    return this.playing && pianoEngine.currentTime < this.countInUntil;
  }

  private segment(piece: Piece): { start: number; end: number } {
    const total = pieceDurationBeats(piece);
    if (this.loop.enabled && this.loop.endBeat > this.loop.startBeat) {
      return { start: this.loop.startBeat, end: Math.min(this.loop.endBeat, total) };
    }
    return { start: 0, end: total };
  }

  private audible(note: Note): boolean {
    return this.mix[note.hand] === 'on';
  }

  positionBeats(): number {
    if (!this.piece || !this.playing) return this.segmentStartBeat;
    const now = pianoEngine.currentTime;
    if (now < this.countInUntil) return this.segmentStartBeat;
    const elapsed = now - this.segmentStartTime;
    if (elapsed < 0) return this.segmentStartBeat;
    return this.segmentStartBeat + (elapsed * this.piece.bpm) / 60;
  }

  activeMidi(): Set<number> {
    const active = new Set<number>();
    const now = pianoEngine.currentTime;
    for (const [midi, until] of this.manualNotes) {
      if (until > now) active.add(midi);
      else this.manualNotes.delete(midi);
    }
    if (!this.piece || !this.playing || this.inCountIn) return active;
    const position = this.positionBeats();
    for (const note of this.piece.notes) {
      if (!this.audible(note)) continue;
      if (note.startBeat <= position && position < note.startBeat + note.durationBeats) {
        active.add(note.midi);
      }
    }
    return active;
  }

  private schedulePass(piece: Piece, startTime: number): number {
    const { start, end } = this.segment(piece);
    const notes = piece.notes.filter(
      (note) => this.audible(note) && note.startBeat >= start - 1e-6 && note.startBeat < end - 1e-6,
    );

    let count = 0;
    for (const note of notes) {
      if (count >= MAX_SCHEDULED_NOTES) break;
      const when = startTime + beatsToSeconds(note.startBeat - start, piece.bpm);
      const duration = beatsToSeconds(note.durationBeats, piece.bpm);
      pianoEngine.playNote(note.midi, note.velocity, when, duration);
      count += 1;
    }

    if (this.metronome.enabled) {
      const step = 1 / Math.max(1, this.metronome.subdivision);
      for (let beat = start; beat < end - 1e-6; beat += step) {
        const inBar = Math.round((beat % piece.beatsPerBar) * 1000) / 1000;
        pianoEngine.click(
          startTime + beatsToSeconds(beat - start, piece.bpm),
          Math.abs(inBar) < 1e-6,
          this.metronome.level,
        );
      }
    }

    return beatsToSeconds(end - start, piece.bpm);
  }

  private startTicking(): void {
    if (this.timer !== null || typeof window === 'undefined') return;
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  private stopTicking(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const piece = this.piece;
    if (!piece || !this.playing) return;
    const now = pianoEngine.currentTime;

    if (now + SCHEDULE_AHEAD_SECONDS < this.scheduledPassEnd) return;

    if (this.loop.enabled) {
      const duration = this.schedulePass(piece, this.scheduledPassEnd);
      this.scheduledPassEnd += duration;
      return;
    }

    if (now >= this.scheduledPassEnd) {
      this.playing = false;
      this.paused = false;
      this.segmentStartBeat = this.segment(piece).start;
      this.pausedAtBeat = null;
      this.stopTicking();
      this.emit();
    }
  }

  play(piece: Piece, fromBeat?: number): { scheduled: number; durationSeconds: number } {
    this.stopInternal();
    this.piece = piece;
    this.pausedAtBeat = null;
    this.paused = false;

    const { start, end } = this.segment(piece);
    const beat = fromBeat ?? start;

    let startTime = pianoEngine.currentTime + LEAD_IN_SECONDS;

    if (this.countInBars > 0) {
      const clickCount = this.countInBars * piece.beatsPerBar;
      for (let i = 0; i < clickCount; i += 1) {
        pianoEngine.click(
          startTime + beatsToSeconds(i, piece.bpm),
          i % piece.beatsPerBar === 0,
          Math.max(this.metronome.level, 0.5),
        );
      }
      const countInSeconds = beatsToSeconds(clickCount, piece.bpm);
      this.countInUntil = startTime + countInSeconds;
      startTime += countInSeconds;
    } else {
      this.countInUntil = 0;
    }

    this.segmentStartBeat = beat;
    this.segmentStartTime = startTime - beatsToSeconds(beat - start, piece.bpm);
    this.playing = true;

    const duration = this.schedulePass(piece, this.segmentStartTime);
    this.scheduledPassEnd = this.segmentStartTime + duration;
    this.startTicking();
    this.emit();

    const scheduled = piece.notes.filter(
      (note) => this.audible(note) && note.startBeat >= start && note.startBeat < end,
    ).length;

    return { scheduled, durationSeconds: beatsToSeconds(end - beat, piece.bpm) };
  }

  pause(): number {
    if (!this.playing) return this.pausedAtBeat ?? this.segmentStartBeat;
    const beat = this.positionBeats();
    this.pausedAtBeat = beat;
    this.segmentStartBeat = beat;
    this.playing = false;
    this.paused = true;
    this.countInUntil = 0;
    this.stopTicking();
    pianoEngine.stopAll();
    this.emit();
    return beat;
  }

  resume(): boolean {
    if (this.playing || !this.piece || this.pausedAtBeat === null) return false;
    const from = this.pausedAtBeat;
    const saved = this.countInBars;
    this.countInBars = 0;
    this.play(this.piece, from);
    this.countInBars = saved;
    return true;
  }

  seek(beat: number): number {
    const piece = this.piece;
    if (!piece) return 0;
    const total = pieceDurationBeats(piece);
    const clamped = Math.min(Math.max(0, beat), total);
    const wasPlaying = this.playing;
    this.stopInternal();
    this.segmentStartBeat = clamped;
    this.pausedAtBeat = clamped;
    this.paused = !wasPlaying;
    if (wasPlaying) this.play(piece, clamped);
    else this.emit();
    return clamped;
  }

  private stopInternal(): void {
    this.stopTicking();
    this.playing = false;
    this.countInUntil = 0;
    pianoEngine.stopAll();
  }

  stop(): void {
    this.stopInternal();
    this.paused = false;
    this.pausedAtBeat = null;
    this.segmentStartBeat = this.piece ? this.segment(this.piece).start : 0;
    this.emit();
  }

  setLoop(next: Partial<LoopState>): LoopState {
    this.loop = { ...this.loop, ...next };
    if (this.playing && this.piece) this.play(this.piece, this.segment(this.piece).start);
    else this.emit();
    return this.loop;
  }

  setMetronome(next: Partial<MetronomeState>): MetronomeState {
    this.metronome = { ...this.metronome, ...next };
    if (this.playing && this.piece) this.play(this.piece, this.positionBeats());
    else this.emit();
    return this.metronome;
  }

  setCountInBars(bars: number): number {
    this.countInBars = Math.min(2, Math.max(0, Math.round(bars)));
    this.emit();
    return this.countInBars;
  }

  getCountInBars(): number {
    return this.countInBars;
  }

  setMix(next: Partial<MixState>): MixState {
    this.mix = { ...this.mix, ...next };
    if (this.playing && this.piece) this.play(this.piece, this.positionBeats());
    else this.emit();
    return this.mix;
  }

  setPiece(piece: Piece): void {
    this.stopInternal();
    this.piece = piece;
    this.paused = false;
    this.pausedAtBeat = null;
    this.loop = { enabled: false, startBeat: 0, endBeat: pieceDurationBeats(piece) };
    this.segmentStartBeat = 0;
    this.emit();
  }

  strike(midi: number, velocity: number, durationSeconds: number): void {
    if (!pianoEngine.ready) return;
    pianoEngine.playNote(midi, velocity, pianoEngine.currentTime, durationSeconds);
    this.manualNotes.set(midi, pianoEngine.currentTime + durationSeconds);
    this.emit();
  }

  playNotesNow(notes: Note[], bpm: number): { scheduled: number; durationSeconds: number } {
    const t0 = pianoEngine.currentTime + LEAD_IN_SECONDS;
    const limited = notes.slice(0, MAX_SCHEDULED_NOTES);
    let last = 0;
    for (const note of limited) {
      const when = t0 + beatsToSeconds(note.startBeat, bpm);
      const duration = beatsToSeconds(note.durationBeats, bpm);
      pianoEngine.playNote(note.midi, note.velocity, when, duration);
      this.manualNotes.set(note.midi, when + duration);
      last = Math.max(last, beatsToSeconds(note.startBeat + note.durationBeats, bpm));
    }
    this.emit();
    return { scheduled: limited.length, durationSeconds: last };
  }
}

export type { Hand };
export const transport = new Transport();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__duetTransport = transport;
}
