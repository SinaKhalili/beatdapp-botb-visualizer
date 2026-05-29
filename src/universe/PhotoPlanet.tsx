import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  orbitParams,
  planetColor,
  planetPosition,
  planetRadius,
} from './placement'
import { createPlanetTexture, planetKind } from './planetTextures'
import { StarSurface } from './StarSurface'
import { sampleAudio } from './audio'

export type PhotoDatum = {
  id: string
  name: string
  company: string
  imageUrl: string
  seed: number
}

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

  return (
    <Billboard>
      {/* Glowing frame (bloom picks this up) */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[2.34, 2.34]} />
        <meshBasicMaterial
          color={hue}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Photo */}
      <mesh>
        <planeGeometry args={[2.1, 2.1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Label */}
      <group position={[0, -1.55, 0]}>
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
  const hue = useMemo(
    () => new THREE.Color().setHSL(h, s, l),
    [h, s, l],
  )
  const emissive = useMemo(
    () => new THREE.Color().setHSL(h, s, Math.min(0.65, l + 0.1)),
    [h, s, l],
  )
  const kind = useMemo(() => planetKind(photo.seed), [photo.seed])
  const texture = useMemo(
    () => (kind === 'star' ? null : createPlanetTexture(photo.seed)),
    [kind, photo.seed],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Scale-in when the planet first appears (new photo arrives).
    const age = (performance.now() - bornAt) / 1000
    const grow = Math.min(1, age / 1.4)
    const eased = 1 - Math.pow(1 - grow, 3)
    if (groupRef.current) {
      groupRef.current.scale.setScalar(eased)
    }

    if (planetRef.current) {
      planetRef.current.rotation.y = t * 0.2
      // Throb the planet on the beat so it dances with the music.
      const audio = sampleAudio(t)
      const pulse = beatPulse ? 1 + audio.beat * 0.06 * pulseStrength : 1
      planetRef.current.scale.setScalar(pulse)
    }
    if (orbitRef.current) {
      // Keep the billboard clear of the planet surface regardless of size.
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
      {/* Planet — animated star, or a textured rocky/gas world */}
      <group ref={planetRef}>
        {kind === 'star' ? (
          <StarSurface radius={radius} hue={hue} />
        ) : (
          <mesh>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshStandardMaterial
              map={texture}
              color="#ffffff"
              emissive={emissive}
              emissiveIntensity={0.12}
              roughness={0.7}
              metalness={0.15}
            />
          </mesh>
        )}
      </group>
      {/* Soft glow halo around the planet */}
      <mesh scale={1.18}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial
          color={hue}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      {/* Orbiting photo billboard */}
      <group ref={orbitRef}>
        <PhotoBillboard photo={photo} hue={hue} />
      </group>
    </group>
  )
}
