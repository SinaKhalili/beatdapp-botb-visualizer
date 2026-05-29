import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BAND_COUNT, sampleAudio } from '../audio'

// Glowing circular waveform rings that snake around the galaxy, their radius
// deformed by the spectrum so they ripple and pulse with the (simulated) music.

const POINTS = 128

function RibbonRing({
  index,
  count,
}: {
  index: number
  count: number
}) {
  const lineRef = useRef<THREE.LineLoop>(null)
  const matRef = useRef<THREE.LineBasicMaterial>(null)

  const baseRadius = 26 + index * 9
  const amp = 6 + index * 1.5
  const yOffset = (index - (count - 1) / 2) * 6
  const dir = index % 2 === 0 ? 1 : -1
  const hueBase = (index / count) * 0.5 + 0.55

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3),
    )
    return g
  }, [])

  const tmpColor = useMemo(() => new THREE.Color(), [])

  useFrame((state) => {
    const audio = sampleAudio(state.clock.elapsedTime)
    const t = state.clock.elapsedTime
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array

    for (let j = 0; j < POINTS; j++) {
      const a = (j / POINTS) * Math.PI * 2
      const bandIdx = Math.floor((j / POINTS) * BAND_COUNT) % BAND_COUNT
      const r =
        baseRadius +
        audio.bands[bandIdx] * amp +
        Math.sin(a * 6 + t * 2) * audio.level * amp * 0.4
      arr[j * 3] = Math.cos(a) * r
      arr[j * 3 + 1] = yOffset + Math.sin(a * 3 + t) * 1.5
      arr[j * 3 + 2] = Math.sin(a) * r
    }
    pos.needsUpdate = true

    if (lineRef.current) lineRef.current.rotation.y = t * 0.05 * dir
    if (matRef.current) {
      const hue = (hueBase + t * 0.04) % 1
      matRef.current.color.copy(tmpColor.setHSL(hue, 0.95, 0.6))
      matRef.current.opacity = 0.5 + audio.level * 0.4
    }
  })

  return (
    <lineLoop ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        ref={matRef}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineLoop>
  )
}

export function WaveformRibbons({ count }: { count: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <RibbonRing key={i} index={i} count={count} />
      ))}
    </group>
  )
}
