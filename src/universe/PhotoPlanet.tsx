import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  orbitParams,
  planetColor,
  planetPosition,
  planetRadius,
  seededRandom,
} from './placement'
import { sampleAudio } from './audio'

export type PhotoDatum = {
  id: string
  name: string
  company: string
  imageUrl: string
  seed: number
}

// Branded comic-style planet sprites (flat, bold-outlined — matches the poster).
const PLANET_SPRITES = Array.from(
  { length: 15 },
  (_, i) => `/planets/planet-${String(i + 1).padStart(2, '0')}.png`,
)

// Photo billboard that orbits a planet: a glowing frame behind the photo plane,
// always facing the camera, with a name/company label underneath.
function PhotoBillboard({
  photo,
  hue,
}: {
  photo: PhotoDatum
  hue: THREE.Color
}) {
  const texture = useTexture(photo.imageUrl)
  texture.colorSpace = THREE.SRGBColorSpace

  // Size the billboard to the photo's real aspect ratio so it isn't stretched.
  const img = texture.image as
    | { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
    | undefined
  const iw = img?.naturalWidth || img?.width || 1
  const ih = img?.naturalHeight || img?.height || 1
  const aspect = iw / ih
  const base = 2.1 // longest side fits this footprint
  const photoW = aspect >= 1 ? base : base * aspect
  const photoH = aspect >= 1 ? base / aspect : base
  const labelY = -(photoH / 2) - 0.5

  return (
    <Billboard>
      {/* Glowing frame (bloom picks this up) */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[photoW + 0.24, photoH + 0.24]} />
        <meshBasicMaterial
          color={hue}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Photo */}
      <mesh>
        <planeGeometry args={[photoW, photoH]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Label */}
      <group position={[0, labelY, 0]}>
        <Text
          fontSize={0.34}
          color="#ffffff"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.012}
          outlineColor="#000000"
          maxWidth={5}
        >
          {photo.name}
        </Text>
        <Text
          position={[0, -0.42, 0]}
          fontSize={0.24}
          color={hue}
          anchorX="center"
          anchorY="top"
          outlineWidth={0.008}
          outlineColor="#000000"
          maxWidth={5}
        >
          {photo.company.toUpperCase()}
        </Text>
      </group>
    </Billboard>
  )
}

export function PhotoPlanet({
  photo,
  index,
  beatPulse = false,
  pulseStrength = 1,
}: {
  photo: PhotoDatum
  index: number
  beatPulse?: boolean
  pulseStrength?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const planetRef = useRef<THREE.Group>(null)
  const orbitRef = useRef<THREE.Group>(null)
  const [bornAt] = useState(() => performance.now())

  const position = useMemo(
    () => planetPosition(index, photo.seed),
    [index, photo.seed],
  )
  const radius = useMemo(() => planetRadius(photo.seed), [photo.seed])
  const orbit = useMemo(() => orbitParams(photo.seed), [photo.seed])
  const [h, s, l] = useMemo(() => planetColor(photo.seed), [photo.seed])
  const hue = useMemo(() => new THREE.Color().setHSL(h, s, l), [h, s, l])

  // Pick a branded planet sprite for this world (stable per seed).
  const spriteSrc = useMemo(
    () =>
      PLANET_SPRITES[
        Math.floor(seededRandom(photo.seed * 23 + 5) * PLANET_SPRITES.length)
      ],
    [photo.seed],
  )
  const texture = useTexture(spriteSrc)
  texture.colorSpace = THREE.SRGBColorSpace

  // Flat sprite is a bit bigger than the old sphere diameter (it has padding).
  const planetSize = radius * 2.4

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Scale-in when the planet first appears (new photo arrives).
    const age = (performance.now() - bornAt) / 1000
    const grow = Math.min(1, age / 1.4)
    const eased = 1 - Math.pow(1 - grow, 3)
    if (groupRef.current) groupRef.current.scale.setScalar(eased)

    if (planetRef.current) {
      // Gentle float + beat throb (no spin — these are flat illustrations).
      planetRef.current.position.y = Math.sin(t * 0.6 + photo.seed) * 0.25
      const audio = sampleAudio(t)
      const pulse = beatPulse ? 1 + audio.beat * 0.07 * pulseStrength : 1
      planetRef.current.scale.setScalar(pulse)
    }
    if (orbitRef.current) {
      // Keep the billboard clear of the planet regardless of size.
      const d = orbit.distance + radius
      const a = orbit.phase + t * orbit.speed
      orbitRef.current.position.set(
        Math.cos(a) * d,
        Math.sin(a) * d * orbit.tilt,
        Math.sin(a) * d,
      )
    }
  })

  return (
    <group ref={groupRef} position={position} scale={0}>
      {/* Planet — branded comic sprite, always facing the camera. */}
      <group ref={planetRef}>
        <Billboard>
          <mesh>
            <planeGeometry args={[planetSize, planetSize]} />
            <meshBasicMaterial
              map={texture}
              transparent
              toneMapped={false}
              depthWrite={false}
              alphaTest={0.05}
            />
          </mesh>
        </Billboard>
      </group>
      {/* Orbiting photo billboard */}
      <group ref={orbitRef}>
        <PhotoBillboard photo={photo} hue={hue} />
      </group>
    </group>
  )
}
