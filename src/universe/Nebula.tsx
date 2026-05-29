import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from './placement'
import { sampleAudio } from './audio'

// Generates one soft radial-gradient sprite texture, reused by every cloud.
function useCloudTexture() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

// Big additive-blended, color-shifting clouds that give the galaxy its
// psychedelic, deep-space atmosphere.
export function Nebula({
  count = 16,
  pulse = false,
  strength = 1,
}: {
  count?: number
  pulse?: boolean
  strength?: number
}) {
  const tex = useCloudTexture()
  const groupRef = useRef<THREE.Group>(null)

  const clouds = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const r1 = seededRandom(i * 101 + 1)
      const r2 = seededRandom(i * 211 + 7)
      const r3 = seededRandom(i * 307 + 13)
      const r4 = seededRandom(i * 401 + 19)
      const angle = r1 * Math.PI * 2
      const dist = 40 + r2 * 90
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * dist,
          (r3 - 0.5) * 60,
          Math.sin(angle) * dist - 30,
        ),
        scale: 40 + r4 * 90,
        hueBase: r1,
        hueSpeed: 0.01 + r2 * 0.03,
        rot: r3 * Math.PI,
      }
    })
  }, [count])

  const matRefs = useRef<Array<THREE.SpriteMaterial | null>>([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const audio = sampleAudio(t)
    const boost = pulse ? audio.level * 0.12 * strength : 0
    clouds.forEach((c, i) => {
      const mat = matRefs.current[i]
      if (mat) {
        const hue = (c.hueBase + t * c.hueSpeed) % 1
        mat.color.setHSL(hue, 0.85, 0.55)
        mat.opacity = 0.1 + 0.05 * Math.sin(t * 0.2 + i) + boost
      }
    })
    if (groupRef.current) groupRef.current.rotation.y = t * 0.005
  })

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <sprite
          key={i}
          position={c.position}
          scale={[c.scale, c.scale, 1]}
        >
          <spriteMaterial
            ref={(m) => (matRefs.current[i] = m)}
            map={tex}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.12}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
