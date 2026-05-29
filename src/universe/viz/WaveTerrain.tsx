import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BAND_COUNT, sampleAudio } from '../audio'
import type * as THREE from 'three'

// Psychedelic wireframe terrain beneath the galaxy that ripples like an
// equalizer landscape. Vertices are displaced in a vertex shader by the audio
// frequency bands; color cycles by height + time for the psychedelic look.

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uHeight;
  uniform float uBands[${BAND_COUNT}];
  varying float vH;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;             // plane lies in local XY
    float r = length(p.xy);
    float fr = clamp(r / 260.0, 0.0, 1.0);
    int idx = int(fr * float(${BAND_COUNT - 1}));
    float band = uBands[idx];
    float ripple = 0.5 + 0.5 * sin(r * 0.06 - uTime * 2.5);
    float h = band * uHeight * (0.4 + 0.6 * ripple);
    h += sin(p.x * 0.045 + uTime) * sin(p.y * 0.045 - uTime * 0.7) * uHeight * 0.18;
    p.z += h;
    vH = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying float vH;
  varying vec2 vUv;

  vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  void main() {
    float hue = fract(0.62 + vH * 0.022 + uTime * 0.03 + vUv.x * 0.25);
    vec3 c = hsl2rgb(hue, 0.95, 0.55);
    c *= 0.45 + vH * 0.12;        // brighter peaks → bloom catches the crests
    gl_FragColor = vec4(c, 1.0);
  }
`

export function WaveTerrain({ height }: { height: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: height },
      uBands: { value: new Float32Array(BAND_COUNT) },
    }),
    [],
  )

  useFrame((state) => {
    const audio = sampleAudio(state.clock.elapsedTime)
    if (matRef.current) {
      const u = matRef.current.uniforms
      u.uTime.value = state.clock.elapsedTime
      u.uHeight.value = height
      ;(u.uBands.value as Float32Array).set(audio.bands)
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -30, 0]}>
      <planeGeometry args={[520, 520, 110, 110]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        wireframe
        transparent
        toneMapped={false}
      />
    </mesh>
  )
}
