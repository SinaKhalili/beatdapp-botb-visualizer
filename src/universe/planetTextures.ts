import * as THREE from 'three'
import { planetColor, seededRandom } from './placement'

// Procedural surface textures so each planet looks like a real world instead of
// a flat sphere. Generated once per planet on a canvas, then used as the
// material map. (Client-only — the /universe route never renders on the server.)

export type PlanetKind = 'bands' | 'speckle' | 'swirl' | 'star'

export function planetKind(seed: number): PlanetKind {
  const r = seededRandom(seed * 23 + 5)
  if (r < 0.18) return 'star' // animated plasma, rendered via shader elsewhere
  const r2 = seededRandom(seed * 29 + 11)
  if (r2 < 0.4) return 'bands'
  if (r2 < 0.75) return 'speckle'
  return 'swirl'
}

// ── Value-noise helpers (cheap, deterministic, good enough for surfaces) ──
function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.013) * 43758.5453
  return n - Math.floor(n)
}

function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x: number, y: number, seed: number): number {
  let val = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < 4; i++) {
    val += amp * vnoise(x * f, y * f, seed + i * 13)
    f *= 2
    amp *= 0.5
  }
  return val
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function createPlanetTexture(seed: number): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const data = img.data

  const kind = planetKind(seed)
  const [h, s, l] = planetColor(seed)
  const dark = new THREE.Color().setHSL(h, s * 0.85, Math.max(0.08, l - 0.32))
  const light = new THREE.Color().setHSL(
    (h + 0.04) % 1,
    s,
    Math.min(0.85, l + 0.22),
  )
  // Occasional contrasting accent band/spot color.
  const accent = new THREE.Color().setHSL((h + 0.5) % 1, s, l + 0.1)

  const bandCount = 4 + Math.floor(seededRandom(seed * 31 + 2) * 7)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 8
      const ny = (y / size) * 8
      let t: number
      let useAccent = 0

      if (kind === 'bands') {
        // Horizontal gas-giant bands, warped by noise for turbulence.
        const warp = fbm(nx * 1.5, ny * 1.5, seed) * 1.2
        const band = Math.sin((y / size) * bandCount * Math.PI * 2 + warp)
        t = 0.5 + 0.5 * band
        t = lerp(t, fbm(nx, ny, seed + 99), 0.25)
        useAccent = Math.pow(Math.max(0, band), 6) * 0.4
      } else if (kind === 'speckle') {
        // Rocky body: base noise plus brighter mineral speckles.
        const base = fbm(nx * 1.2, ny * 1.2, seed)
        const speck = fbm(nx * 6, ny * 6, seed + 50)
        t = base * 0.7 + 0.15
        useAccent = speck > 0.72 ? (speck - 0.72) * 2.5 : 0
      } else {
        // Swirl / marble: domain-warped noise.
        const wx = fbm(nx, ny, seed + 7) * 3
        const wy = fbm(nx + 5, ny + 5, seed + 21) * 3
        t = fbm(nx + wx, ny + wy, seed)
        useAccent = Math.pow(t, 4) * 0.5
      }

      const c = dark.clone().lerp(light, Math.min(1, Math.max(0, t)))
      if (useAccent > 0) c.lerp(accent, Math.min(0.7, useAccent))

      const idx = (y * size + x) * 4
      data[idx] = c.r * 255
      data[idx + 1] = c.g * 255
      data[idx + 2] = c.b * 255
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
