import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// A galaxy-like deep-space backdrop: thousands of color-temperature stars that
// twinkle, clustered into a tilted Milky-Way band, plus a soft luminous haze
// running along the band. Replaces drei's flat <Stars>.

const STAR_COUNT = 16000

// Rough stellar color palette (cool blues → hot pinks), weighted toward white.
const PALETTE: Array<[number, number, number]> = [
  [0.75, 0.83, 1.0], // blue-white
  [1.0, 1.0, 1.0], // white
  [1.0, 1.0, 1.0], // white (extra weight)
  [0.7, 0.92, 1.0], // cyan
  [1.0, 0.86, 0.62], // warm
  [1.0, 0.62, 0.38], // orange
  [1.0, 0.62, 0.9], // pink
]

// Cheap approx-gaussian in [-1.5, 1.5] for thin-band scatter.
function gauss(): number {
  return Math.random() + Math.random() + Math.random() - 1.5
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixel;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vColor = aColor;
    float tw = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase * 6.2831);
    vTw = tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.6 + 0.7 * tw) * uPixel * (320.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = pow(smoothstep(0.5, 0.0, d), 1.7);
    gl_FragColor = vec4(vColor * (0.6 + 0.7 * vTw), a);
  }
`

function useHazeTexture() {
  return useMemo(() => {
    const size = 256
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.3)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

export function Starscape() {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { gl } = useThree()
  const haze = useHazeTexture()

  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const phases = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      const R = 300 + Math.random() * 380
      const inBand = Math.random() < 0.55
      let lat: number
      const lon = Math.random() * Math.PI * 2
      if (inBand) {
        lat = gauss() * 0.16 // thin tilted band
      } else {
        lat = Math.asin(2 * Math.random() - 1) // uniform over the sphere
      }
      const cl = Math.cos(lat)
      positions[i * 3] = Math.cos(lon) * cl * R
      positions[i * 3 + 1] = Math.sin(lat) * R
      positions[i * 3 + 2] = Math.sin(lon) * cl * R

      // Brighter/warmer stars more likely in the band; mostly small.
      const pick = inBand
        ? PALETTE[Math.floor(Math.random() * PALETTE.length)]
        : PALETTE[Math.floor(Math.random() * 4)]
      const dim = 0.55 + Math.random() * 0.45
      colors[i * 3] = pick[0] * dim
      colors[i * 3 + 1] = pick[1] * dim
      colors[i * 3 + 2] = pick[2] * dim

      const big = Math.random()
      sizes[i] = big > 0.985 ? 5 + Math.random() * 6 : 0.8 + Math.random() * 2.2
      phases[i] = Math.random()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    return g
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixel: { value: gl.getPixelRatio() },
    }),
    [gl],
  )

  // Soft glowing haze blobs strung along the galactic band.
  const hazeBlobs = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const lon = (i / 7) * Math.PI * 2 + Math.random() * 0.6
      const R = 360
      const lat = gauss() * 0.05
      const cl = Math.cos(lat)
      const hue = 0.55 + Math.random() * 0.35
      return {
        position: new THREE.Vector3(
          Math.cos(lon) * cl * R,
          Math.sin(lat) * R,
          Math.sin(lon) * cl * R,
        ),
        scale: 220 + Math.random() * 160,
        color: new THREE.Color().setHSL(hue, 0.8, 0.6),
      }
    })
  }, [])

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    if (groupRef.current) groupRef.current.rotation.y = state.clock.elapsedTime * 0.004
  })

  return (
    // Tilt so the band reads as a diagonal galactic plane across the sky.
    <group ref={groupRef} rotation={[0.4, 0.6, 0.25]}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {hazeBlobs.map((b, i) => (
        <sprite key={i} position={b.position} scale={[b.scale, b.scale * 0.5, 1]}>
          <spriteMaterial
            map={haze}
            color={b.color}
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
