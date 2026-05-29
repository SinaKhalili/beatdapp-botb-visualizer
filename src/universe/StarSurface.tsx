import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A churning-plasma star: animated fbm noise shader. Outputs values >1 so the
// bloom pass makes it actually glow. Used for ~1 in 5 planets for variety.

const vertexShader = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColA;
  uniform vec3 uColB;
  varying vec3 vPos;

  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

  void main(){
    vec3 p = normalize(vPos) * 3.0;
    float n  = fbm(p + vec3(0.0, uTime * 0.15, 0.0));
    float n2 = fbm(p * 2.2 - vec3(uTime * 0.1));
    float t = n * 0.7 + n2 * 0.3;
    vec3 col = mix(uColA, uColB, smoothstep(0.25, 0.8, t));
    col += uColB * pow(t, 3.0) * 1.6;            // hot spots, pushed past 1.0 for bloom
    gl_FragColor = vec4(col, 1.0);
  }
`

export function StarSurface({
  radius,
  hue,
}: {
  radius: number
  hue: THREE.Color
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => {
    const a = hue.clone().multiplyScalar(0.35)
    const b = hue.clone().lerp(new THREE.Color('#fff4d6'), 0.4)
    return {
      uTime: { value: 0 },
      uColA: { value: a },
      uColB: { value: b },
    }
  }, [hue])

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        toneMapped={false}
      />
    </mesh>
  )
}
