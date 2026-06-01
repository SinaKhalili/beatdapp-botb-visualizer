import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// The branded orange hypnotic spiral, laid flat as a slowly-rotating galactic
// disc beneath the floating planets — the poster's signature swirl.
export function BrandSpiral() {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useTexture('/brand/spiral.png')
  texture.colorSpace = THREE.SRGBColorSpace

  useFrame((state) => {
    if (groupRef.current) {
      // Slow hypnotic swirl — ~one full turn per minute (visible, not dizzying).
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.11
    }
  })

  return (
    <group ref={groupRef} position={[0, -14, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[340, 340]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
