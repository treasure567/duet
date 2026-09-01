import { detectPitch } from './detect';
import { readingToMidi, samplesToNotes, type PitchSample } from './phrase';
import type { Note } from '../music/piece';

export interface ListenResult {
  notes: Note[];
  sampleCount: number;
  voicedSeconds: number;
}

class MicListener {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array | null = null;
  private samples: PitchSample[] = [];
  private timer: number | null = null;
  private startTime = 0;
  private liveMidi: number | null = null;

  get granted(): boolean {
    return this.stream !== null;
  }

  get listening(): boolean {
    return this.timer !== null;
  }

  get currentMidi(): number | null {
    return this.liveMidi;
  }

  async request(): Promise<boolean> {
    if (this.stream) return true;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.context = new Ctor();
      const source = this.context.createMediaStreamSource(this.stream);
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      this.analyser = analyser;
      this.buffer = new Float32Array(analyser.fftSize);
      return true;
    } catch {
      this.stream = null;
      return false;
    }
  }

  start(): boolean {
    if (!this.analyser || !this.buffer || !this.context) return false;
    this.samples = [];
    this.liveMidi = null;
    this.startTime = this.context.currentTime;
    this.timer = window.setInterval(() => this.sample(), 20);
    return true;
  }

  private sample(): void {
    if (!this.analyser || !this.buffer || !this.context) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const reading = detectPitch(this.buffer, this.context.sampleRate);
    const midi = readingToMidi(reading.frequency, reading.clarity);
    this.liveMidi = midi === null ? null : Math.round(midi);
    this.samples.push({ timeSeconds: this.context.currentTime - this.startTime, midi });
  }

  stop(bpm: number): ListenResult {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.liveMidi = null;
    const voiced = this.samples.filter((sample) => sample.midi !== null).length;
    return {
      notes: samplesToNotes(this.samples, bpm),
      sampleCount: this.samples.length,
      voicedSeconds: Math.round((voiced * 0.02 + Number.EPSILON) * 100) / 100,
    };
  }

  release(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.analyser = null;
    this.context?.close();
    this.context = null;
  }
}

export const micListener = new MicListener();
