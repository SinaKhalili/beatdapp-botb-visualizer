// Simulated "music" signal that drives every visualizer effect. No real audio:
// layered sines + a synthetic beat envelope produce frequency bands, bass/mid/
// treble levels, and a beat spike. One source of truth, sampled once per frame.
//
// Architected so real audio can replace `compute()` later (Web Audio
// AnalyserNode → fill `bands` / `bass` / etc.) without touching consumers.

export const BAND_COUNT = 48

export type AudioState = {
  bands: Float32Array
  bass: number
  mid: number
  treble: number
  level: number
  beat: number // 0..1 envelope, spikes on each beat
}

export const audioState: AudioState = {
  bands: new Float32Array(BAND_COUNT),
  bass: 0,
  mid: 0,
  treble: 0,
  level: 0,
  beat: 0,
}

type AudioConfig = { enabled: boolean; bpm: number; intensity: number }
let cfg: AudioConfig = { enabled: true, bpm: 120, intensity: 1 }

export function setAudioConfig(next: Partial<AudioConfig>) {
  cfg = { ...cfg, ...next }
}

let lastTime = -1

// Sample the signal for `time` (seconds). Memoized per frame: the first caller
// computes, everyone else gets the cached state — so call order doesn't matter.
export function sampleAudio(time: number): AudioState {
  if (time === lastTime) return audioState
  lastTime = time

  const { bands } = audioState

  if (!cfg.enabled) {
    // Gentle decay to silence so toggling off doesn't snap.
    for (let i = 0; i < BAND_COUNT; i++) bands[i] *= 0.9
    audioState.bass *= 0.9
    audioState.mid *= 0.9
    audioState.treble *= 0.9
    audioState.level *= 0.9
    audioState.beat *= 0.9
    return audioState
  }

  const intensity = cfg.intensity
  const beatHz = cfg.bpm / 60
  const phase = time * beatHz
  const frac = phase - Math.floor(phase)

  // Sharp attack, exponential decay each beat; small off-beat (the "and").
  const main = Math.exp(-frac * 7)
  const off = Math.exp(-((frac + 0.5) % 1) * 9) * 0.45
  const beat = Math.min(1, (main + off) * intensity)
  audioState.beat = beat

  let bassSum = 0
  let midSum = 0
  let trebleSum = 0
  const third = BAND_COUNT / 3

  for (let i = 0; i < BAND_COUNT; i++) {
    const f = i / BAND_COUNT // 0 = bass, 1 = treble
    // A few detuned oscillators per band for an organic spectrum.
    const osc =
      0.5 +
      0.5 *
        (0.45 * Math.sin(time * (1.1 + f * 5.0) + i * 0.7) +
          0.35 * Math.sin(time * (0.6 + f * 2.3) + i * 1.9) +
          0.2 * Math.sin(time * (2.7 + f * 8.0) + i * 0.3))
    // Beat slams the low end; highs shimmer more on their own.
    const beatGain = beat * (1 - f) * 0.9
    const v = Math.min(1, (osc * (0.35 + 0.35 * f) + beatGain) * intensity)
    bands[i] = v

    if (i < third) bassSum += v
    else if (i < third * 2) midSum += v
    else trebleSum += v
  }

  audioState.bass = bassSum / third
  audioState.mid = midSum / third
  audioState.treble = trebleSum / third
  audioState.level = (audioState.bass + audioState.mid + audioState.treble) / 3

  return audioState
}
