export interface PitchReading {
  frequency: number;
  clarity: number;
  rms: number;
}

const MIN_FREQUENCY = 70;
const MAX_FREQUENCY = 1400;

export function detectPitch(buffer: Float32Array, sampleRate: number): PitchReading {
  const size = buffer.length;
  let sumSquares = 0;
  for (let i = 0; i < size; i += 1) sumSquares += buffer[i] * buffer[i];
  const rms = Math.sqrt(sumSquares / size);
  if (rms < 0.008) return { frequency: 0, clarity: 0, rms };

  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQUENCY), Math.floor(size / 2));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY));

  const difference = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i < size - lag; i += 1) {
      const delta = buffer[i] - buffer[i + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  const normalised = new Float32Array(maxLag + 1);
  normalised[0] = 1;
  let runningSum = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    runningSum += difference[lag];
    normalised[lag] = runningSum === 0 ? 1 : (difference[lag] * (lag - minLag + 1)) / runningSum;
  }

  const threshold = 0.16;
  let bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    if (normalised[lag] < threshold) {
      let candidate = lag;
      while (candidate + 1 <= maxLag && normalised[candidate + 1] < normalised[candidate]) {
        candidate += 1;
      }
      bestLag = candidate;
      break;
    }
  }

  if (bestLag === -1) {
    let minimum = Number.POSITIVE_INFINITY;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      if (normalised[lag] < minimum) {
        minimum = normalised[lag];
        bestLag = lag;
      }
    }
    if (bestLag === -1 || minimum > 0.55) return { frequency: 0, clarity: 0, rms };
  }

  const previous = normalised[bestLag - 1] ?? normalised[bestLag];
  const next = normalised[bestLag + 1] ?? normalised[bestLag];
  const denominator = 2 * (2 * normalised[bestLag] - previous - next);
  const shift = denominator === 0 ? 0 : (next - previous) / denominator;
  const refinedLag = bestLag + shift;

  const frequency = sampleRate / refinedLag;
  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return { frequency: 0, clarity: 0, rms };
  }

  return { frequency, clarity: 1 - normalised[bestLag], rms };
}
