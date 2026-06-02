import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Leva } from 'leva'
import { useMutation, useQuery } from 'convex/react'
import * as THREE from 'three'
import { api } from '../../convex/_generated/api'
import { Nebula } from './Nebula'
import { AutoPilotCamera } from './AutoPilotCamera'
import { PER_PLANET, PlanetGroup } from './PhotoPlanet'
import { setAudioConfig } from './audio'
import { useVizControls } from './controls'
import { WaveTerrain } from './viz/WaveTerrain'
import { Shockwaves } from './viz/Shockwaves'
import { WaveformRibbons } from './viz/WaveformRibbons'
import { Starscape } from './Starscape'
import { BrandSpiral } from './BrandSpiral'
import type { VizConfig } from './controls'
import type { PhotoDatum } from './PhotoPlanet'

function Scene({
  photos,
  viz,
}: {
  photos: Array<PhotoDatum>
  viz: VizConfig
}) {
  // Group people into planets (PER_PLANET each). Ordering is stable, so a
  // planet keeps its members as new people fill the last group then start a new
  // one.
  const groups = useMemo(() => {
    const out: Array<Array<PhotoDatum>> = []
    for (let i = 0; i < photos.length; i += PER_PLANET) {
      out.push(photos.slice(i, i + PER_PLANET))
    }
    return out
  }, [photos])

  return (
    <>
      <color attach="background" args={['#190a3a']} />
      <fog attach="fog" args={['#190a3a', 70, 260]} />

      <ambientLight intensity={0.32} />
      <pointLight position={[0, 0, 0]} intensity={1.4} color="#a78bfa" />
      <directionalLight position={[20, 30, 10]} intensity={0.6} color="#ffd9f4" />

      <Starscape />
      <Suspense fallback={null}>
        <BrandSpiral />
      </Suspense>
      <Nebula pulse={viz.beatPulse} strength={viz.pulseStrength} />

      {viz.terrain && <WaveTerrain height={viz.terrainHeight} />}
      {viz.ribbons && <WaveformRibbons count={viz.ribbonCount} />}
      {viz.shockwaves && <Shockwaves strength={viz.pulseStrength} />}

      {groups.map((group, i) => (
        // Per-planet Suspense so one texture (re)loading — e.g. the live alien
        // swap — never blanks the rest of the galaxy.
        <Suspense key={group[0].id} fallback={null}>
          <PlanetGroup
            photos={group}
            index={i}
            beatPulse={viz.beatPulse}
            pulseStrength={viz.pulseStrength}
          />
        </Suspense>
      ))}

      <AutoPilotCamera anchors={groups.map((g) => ({ seed: g[0].seed }))} />

      <EffectComposer>
        <Bloom
          mipmapBlur
          intensity={viz.bloom}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.45}
        />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </>
  )
}

// Full-screen loading screen shown while photos + their textures load, driven by
// drei's global loading-manager progress. Fades out once everything is ready.
function LoadingScreen({ photosReady }: { photosReady: boolean }) {
  const { active, progress } = useProgress()
  const started = useRef(false)
  const [done, setDone] = useState(false)
  const [hidden, setHidden] = useState(false)

  // Remember once texture loading has actually begun.
  useEffect(() => {
    if (active) started.current = true
  }, [active])

  // Complete once loads finished (after they started), or as a safety timeout.
  useEffect(() => {
    if (photosReady && started.current && !active) {
      const t = setTimeout(() => setDone(true), 400)
      return () => clearTimeout(t)
    }
  }, [photosReady, active])

  useEffect(() => {
    const safety = setTimeout(() => setDone(true), 15000)
    return () => clearTimeout(safety)
  }, [])

  // Unmount shortly after the fade-out finishes.
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setHidden(true), 800)
      return () => clearTimeout(t)
    }
  }, [done])

  if (hidden) return null

  const connecting = !photosReady || !started.current
  const pct = started.current ? Math.round(progress) : 0

  return (
    <div className={`loading-overlay${done ? ' loading-overlay--done' : ''}`}>
      <img
        className="brand-title brand-title--md"
        src="/brand/botb-title.png"
        alt="BOTB Universe"
      />
      <div className="loading-bar">
        <div
          className="loading-bar-fill"
          style={{ width: connecting ? '8%' : `${Math.max(8, pct)}%` }}
        />
      </div>
      <div className="loading-text">
        {connecting
          ? 'Connecting to the galaxy…'
          : `Summoning worlds · ${pct}%`}
      </div>
    </div>
  )
}

export function Universe() {
  const photos = useQuery(api.photos.listPhotos) ?? []
  const seedPhotos = useMutation(api.photos.seedPhotos)
  const viz = useVizControls()
  const [panelHidden, setPanelHidden] = useState(false)
  const [presentation, setPresentation] = useState(false)

  // Make the screen look alive immediately if the table is empty.
  useEffect(() => {
    void seedPhotos({})
  }, [seedPhotos])

  // Keep the audio engine in sync with the control panel.
  useEffect(() => {
    setAudioConfig({
      enabled: viz.enabled,
      bpm: viz.bpm,
      intensity: viz.intensity,
    })
  }, [viz.enabled, viz.bpm, viz.intensity])

  // Keyboard shortcuts: "h" toggles the control panel, Esc exits presentation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setPanelHidden((v) => !v)
      if (e.key === 'Escape') setPresentation(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`universe-root${presentation ? ' presentation' : ''}`}>
      <Leva hidden={panelHidden || presentation} collapsed={false} />
      <Canvas
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 6, 24] }}
      >
        <Scene photos={photos} viz={viz} />
      </Canvas>

      <LoadingScreen photosReady={photos.length > 0} />

      <div className="universe-overlay">
        <img
          className="brand-title brand-title--sm"
          src="/brand/botb-title.png"
          alt="BOTB Universe"
        />
      </div>

      {!presentation && (
        <div className="universe-buttons">
          <button
            type="button"
            className="universe-btn"
            onClick={() => setPanelHidden((v) => !v)}
          >
            {panelHidden ? 'Show controls' : 'Hide controls'}
          </button>
          <button
            type="button"
            className="universe-btn"
            onClick={() => {
              setPresentation(true)
              setPanelHidden(true)
            }}
          >
            Hide cursor &amp; UI (Esc to exit)
          </button>
        </div>
      )}

      <div className="universe-grain" />
    </div>
  )
}
