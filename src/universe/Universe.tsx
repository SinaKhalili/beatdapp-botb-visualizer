import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Leva } from 'leva'
import { useQuery } from 'convex/react'
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
import { GalleryPanel, Lightbox } from './GalleryPanel'
import type { VizConfig } from './controls'
import type { PhotoDatum } from './PhotoPlanet'

// Phones/tablets get a capped pixel ratio — a retina iPhone at dpr 3 with
// post-processing is a fast way to run out of GPU memory.
const isTouchDevice =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches

function Scene({
  photos,
  viz,
  focusGroup,
}: {
  photos: Array<PhotoDatum>
  viz: VizConfig
  focusGroup: number | null
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

      <AutoPilotCamera
        anchors={groups.map((g) => ({ seed: g[0].seed }))}
        zoom={viz.zoom}
        focusIndex={focusGroup}
      />

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
  const viz = useVizControls()
  // Effects panel starts hidden; "Show controls" or "h" reveals it.
  const [panelHidden, setPanelHidden] = useState(true)
  const [presentation, setPresentation] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  // Index into `photos` of the gallery selection (the camera focuses its planet).
  const [focusPhoto, setFocusPhoto] = useState<number | null>(null)
  // Photo shown in the fullscreen lightbox, if any.
  const [enlarged, setEnlarged] = useState<PhotoDatum | null>(null)

  const focusGroup =
    focusPhoto === null ? null : Math.floor(focusPhoto / PER_PLANET)

  function closeGallery() {
    setGalleryOpen(false)
    setFocusPhoto(null) // resume the auto-pilot tour
  }

  // Keep the audio engine in sync with the control panel.
  useEffect(() => {
    setAudioConfig({
      enabled: viz.enabled,
      bpm: viz.bpm,
      intensity: viz.intensity,
    })
  }, [viz.enabled, viz.bpm, viz.intensity])

  // Keyboard shortcuts: "h" toggles the control panel, "g" the gallery, and
  // Esc peels back one layer at a time: lightbox → gallery/presentation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setPanelHidden((v) => !v)
      if (e.key === 'g' || e.key === 'G') {
        setGalleryOpen((v) => {
          if (v) setFocusPhoto(null)
          return !v
        })
      }
      if (e.key === 'Escape') {
        setEnlarged((cur) => {
          if (cur === null) {
            setPresentation(false)
            setGalleryOpen(false)
            setFocusPhoto(null)
          }
          return null
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`universe-root${presentation ? ' presentation' : ''}`}>
      <Leva hidden={panelHidden || presentation} collapsed={false} />
      <Canvas
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={isTouchDevice ? [1, 1.5] : [1, 2]}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 6, 24] }}
      >
        <Scene photos={photos} viz={viz} focusGroup={focusGroup} />
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
        <GalleryPanel
          photos={photos}
          open={galleryOpen}
          selectedId={focusPhoto === null ? null : (photos[focusPhoto]?.id ?? null)}
          onSelect={setFocusPhoto}
          onEnlarge={setEnlarged}
          onClose={closeGallery}
        />
      )}

      {enlarged && (
        <Lightbox photo={enlarged} onClose={() => setEnlarged(null)} />
      )}

      {!presentation && (
        <div className="universe-buttons">
          <button
            type="button"
            className="universe-btn"
            onClick={() => {
              if (galleryOpen) closeGallery()
              else setGalleryOpen(true)
            }}
          >
            {galleryOpen ? 'Close gallery' : 'Gallery'}
          </button>
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
