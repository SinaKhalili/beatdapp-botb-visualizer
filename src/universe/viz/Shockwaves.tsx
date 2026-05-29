import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleAudio } from '../audio'

// Concentric rings that burst outward from the galaxy center on strong beats and
// fade as they expand. A small fixed pool is recycled — no per-beat allocation.

const POOL = 10
const LIFE = 2.6 // seconds per ring
const MAX_SCALE = 70

type Ring = { age: number; active: boolean; hue: number }

export function Shockwaves({ strength = 1 }: { strength?: number }) {
  const groupRefs = useRef<Array<THREE.Mesh | null>>([])
  const matRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const rings = useRef<Array<Ring>>(
    Array.from({ length: POOL }, () => ({ age: 0, active: false, hue: 0 })),
  )
  const prevBeat = useRef(0)
  const hueCursor = useRef(0)

  // Reusable color so we don't allocate each frame.
  const tmpColor = useMemo(() => new THREE.Color(), [])

  useFrame((state, delta) => {
    const audio = sampleAudio(state.clock.elapsedTime)

    // Beat onset detection → spawn a ring into the first free slot.
    if (audio.beat > 0.62 && prevBeat.current <= 0.62) {
      const slot = rings.current.findIndex((r) => !r.active)
      if (slot !== -1) {
        hueCursor.current = (hueCursor.current + 0.13) % 1
        rings.current[slot] = {
          age: 0,
          active: true,
          hue: hueCursor.current,
        }
      }
    }
    prevBeat.current = audio.beat

    rings.current.forEach((ring, i) => {
      const mesh = groupRefs.current[i]
      const mat = matRefs.current[i]
      if (!mesh || !mat) return
      if (!ring.active) {
        mesh.visible = false
        return
      }
      ring.age += delta
      const t = ring.age / LIFE
      if (t >= 1) {
        ring.active = false
        mesh.visible = false
        return
      }
      mesh.visible = true
      const scale = 2 + t * MAX_SCALE
      mesh.scale.set(scale, scale, scale)
      mat.opacity = (1 - t) * 0.8 * strength
      mat.color.copy(tmpColor.setHSL(ring.hue, 0.9, 0.6))
    })
  })

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => (groupRefs.current[i] = m)}
          visible={false}
        >
          <ringGeometry args={[0.93, 1, 96]} />
          <meshBasicMaterial
            ref={(m) => (matRefs.current[i] = m)}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
