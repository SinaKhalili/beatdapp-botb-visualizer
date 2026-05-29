// Deterministic placement + styling for planets, derived from stable data so
// nothing jumps around on re-render.

// Small deterministic PRNG from an integer seed → float in [0, 1).
export function seededRandom(seed: number): number {
  // Mulberry-ish hash; good enough for jitter/hue.
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // ~137.5°
const SPACING = 6 // distance scale between successive planets
const VERTICAL_SPREAD = 14 // how far planets drift above/below the disk

// Position planet `index` on a golden-angle spiral that grows outward forever.
export function planetPosition(
  index: number,
  seed: number,
): [number, number, number] {
  const angle = index * GOLDEN_ANGLE
  const radius = SPACING * Math.sqrt(index + 0.6)
  const x = radius * Math.cos(angle)
  const z = radius * Math.sin(angle)
  // Vertical jitter grows slightly with radius for a domed, 3D galaxy.
  const y =
    (seededRandom(seed) - 0.5) * VERTICAL_SPREAD * (0.4 + radius * 0.012)
  return [x, y, z]
}

// Vibrant, psychedelic hue per planet (HSL → returned as [h, s, l]).
export function planetColor(seed: number): [number, number, number] {
  const h = seededRandom(seed) // full hue wheel
  const s = 0.7 + seededRandom(seed * 7 + 1) * 0.3
  const l = 0.5 + seededRandom(seed * 13 + 3) * 0.15
  return [h, s, l]
}

// Per-planet variation so the field doesn't feel uniform.
export function planetRadius(seed: number): number {
  return 0.75 + seededRandom(seed * 3 + 2) * 0.95
}

export function orbitParams(seed: number): {
  distance: number
  speed: number
  phase: number
  tilt: number
} {
  return {
    distance: 2.6 + seededRandom(seed * 5 + 4) * 1.4,
    speed: 0.15 + seededRandom(seed * 11 + 6) * 0.25,
    phase: seededRandom(seed * 17 + 8) * Math.PI * 2,
    tilt: (seededRandom(seed * 19 + 9) - 0.5) * 0.8,
  }
}
