import { midiToFrequency } from '../music/notes';

interface Voice {
  stop: (atTime: number) => void;
  nodes: AudioNode[];
}

function createImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.floor(rate * seconds);
  const impulse = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export class PianoEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private levelBuffer: Float32Array | null = null;
  private active = new Map<number, Voice>();
  private scheduled = new Set<Voice>();
  private volume = 0.75;

  get ready(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  get currentTime(): number {
    return this.context ? this.context.currentTime : 0;
  }

  async unlock(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;

    if (!this.context) {
      const context = new Ctor();
      const master = context.createGain();
      master.gain.value = this.volume;
      master.connect(context.destination);

      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      master.connect(analyser);
      this.analyser = analyser;
      this.levelBuffer = new Float32Array(analyser.fftSize);

      const dry = context.createGain();
      dry.gain.value = 0.82;
      dry.connect(master);

      const convolver = context.createConvolver();
      convolver.buffer = createImpulse(context, 1.8, 2.6);
      const wet = context.createGain();
      wet.gain.value = 0.22;
      wet.connect(convolver);
      convolver.connect(master);

      this.context = context;
      this.master = master;
      this.dry = dry;
      this.wet = wet;
    }

    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getLevel(): number {
    if (!this.analyser || !this.levelBuffer) return 0;
    this.analyser.getFloatTimeDomainData(this.levelBuffer);
    let sum = 0;
    for (let i = 0; i < this.levelBuffer.length; i += 1) {
      sum += this.levelBuffer[i] * this.levelBuffer[i];
    }
    return Math.sqrt(sum / this.levelBuffer.length);
  }

  playNote(midi: number, velocity: number, startTime: number, durationSeconds: number): void {
    const context = this.context;
    if (!context || !this.dry || !this.wet) return;

    const when = Math.max(startTime, context.currentTime);
    const frequency = midiToFrequency(midi);
    const level = Math.min(1, Math.max(0.05, velocity));
    const brightness = 1800 + level * 5200 + Math.max(0, (midi - 48) * 55);
    const release = 0.34 + Math.max(0, (84 - midi) / 84) * 1.1;

    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(level * 0.34, when + 0.006);
    amp.gain.exponentialRampToValueAtTime(level * 0.16, when + 0.28);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(brightness, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(320, brightness * 0.22), when + 1.1);

    amp.connect(filter);
    filter.connect(this.dry);
    filter.connect(this.wet);

    const partials: [number, number, OscillatorType][] = [
      [1, 1, 'triangle'],
      [2, 0.36, 'sine'],
      [3, 0.16, 'sine'],
      [4.02, 0.08, 'sine'],
    ];

    const oscillators: OscillatorNode[] = [];
    for (const [ratio, gainValue, type] of partials) {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency * ratio;
      oscillator.detune.value = (ratio === 1 ? 0 : 4) * (Math.random() - 0.5);

      const partialGain = context.createGain();
      partialGain.gain.value = gainValue;
      oscillator.connect(partialGain);
      partialGain.connect(amp);
      oscillator.start(when);
      oscillators.push(oscillator);
    }

    const hammer = context.createBufferSource();
    const noiseLength = Math.floor(context.sampleRate * 0.03);
    const noise = context.createBuffer(1, noiseLength, context.sampleRate);
    const noiseData = noise.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLength, 3);
    }
    hammer.buffer = noise;
    const hammerFilter = context.createBiquadFilter();
    hammerFilter.type = 'bandpass';
    hammerFilter.frequency.value = Math.min(7000, frequency * 5);
    hammerFilter.Q.value = 0.8;
    const hammerGain = context.createGain();
    hammerGain.gain.value = level * 0.1;
    hammer.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(amp);
    hammer.start(when);

    const endTime = when + Math.max(0.12, durationSeconds);
    const stopAll = (atTime: number) => {
      const safeTime = Math.max(atTime, context.currentTime);
      amp.gain.cancelScheduledValues(safeTime);
      amp.gain.setTargetAtTime(0.0001, safeTime, release / 4);
      const hardStop = safeTime + release;
      for (const oscillator of oscillators) {
        try {
          oscillator.stop(hardStop);
        } catch {
          return;
        }
      }
      try {
        hammer.stop(hardStop);
      } catch {
        return;
      }
    };

    const previous = this.active.get(midi);
    if (previous) previous.stop(when);

    const voice: Voice = { stop: stopAll, nodes: [amp, filter] };
    this.active.set(midi, voice);
    this.scheduled.add(voice);
    stopAll(endTime);

    window.setTimeout(
      () => {
        if (this.active.get(midi) === voice) this.active.delete(midi);
        this.scheduled.delete(voice);
      },
      Math.max(0, (endTime + release - context.currentTime) * 1000) + 60,
    );
  }

  click(atTime: number, accent: boolean, level = 0.5): void {
    const context = this.context;
    if (!context || !this.dry) return;
    const when = Math.max(atTime, context.currentTime);

    const osc = context.createOscillator();
    osc.type = 'square';
    osc.frequency.value = accent ? 1600 : 1050;

    const gain = context.createGain();
    const peak = level * (accent ? 0.16 : 0.1);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = accent ? 1900 : 1200;
    filter.Q.value = 1.2;

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(this.dry);
    osc.start(when);
    osc.stop(when + 0.07);
  }

  stopAll(): void {
    const context = this.context;
    if (!context) return;
    for (const voice of this.scheduled) voice.stop(context.currentTime);
    this.scheduled.clear();
    this.active.clear();
  }
}

export const pianoEngine = new PianoEngine();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__duetEngine = pianoEngine;
}
