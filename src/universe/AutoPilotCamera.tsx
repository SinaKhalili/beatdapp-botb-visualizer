import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { planetPosition } from './placement'

const PLANET_DWELL = 11 // seconds lingering on a single planet
const WIDE_DWELL = 13 // seconds on a wide establishing shot
const WIDE_EVERY = 4 // every Nth move is a pull-back-and-see-everyone shot

// Distances cycled through on planet shots so the framing varies — intimate
// close-up → medium → pulled back. Scaled by the `zoom` control.
const ZOOM_LEVELS = [7, 11, 15, 20]

// Unattended auto-pilot. Glides slowly between planets (no snapping), swings to
// the newest planet when one arrives, varies the zoom each visit, and
// periodically pulls way back for a wide establishing shot.
export function AutoPilotCamera({
  anchors,
  zoom = 1,
}: {
  anchors: Array<{ seed: number }>
  zoom?: number
}) {
  const { camera } = useThree()

  const moveCount = useRef(0)
  const targetIndex = useRef(0)
  const isWide = useRef(false)
  const lastSwitch = useRef(0)
  const knownCount = useRef(0)
  const distLevel = useRef(ZOOM_LEVELS[1])
  const lookAt = useRef(new THREE.Vector3(0, 0, 0))
  const desiredPos = useRef(new THREE.Vector3(0, 6, 24))

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const count = anchors.length
    if (count === 0) return

    // A new planet just arrived → glide to it (interrupts a wide shot).
    if (count > knownCount.current) {
      targetIndex.current = count - 1
      isWide.current = false
      distLevel.current = ZOOM_LEVELS[moveCount.current % ZOOM_LEVELS.length]
      lastSwitch.current = t
      knownCount.current = count
    }

    // Advance the tour on a timer.
    const dwell = isWide.current ? WIDE_DWELL : PLANET_DWELL
    if (t - lastSwitch.current > dwell) {
      moveCount.current += 1
      // Wide shots only make sense once there's a crowd to take in.
      if (count >= 6 && moveCount.current % WIDE_EVERY === 0) {
        isWide.current = true
      } else {
        isWide.current = false
        targetIndex.current = (targetIndex.current + 1) % count
        // Vary the zoom level each planet visit.
        distLevel.current = ZOOM_LEVELS[moveCount.current % ZOOM_LEVELS.length]
      }
      lastSwitch.current = t
    }

    // Smooth (frame-rate independent) easing — small per-frame fraction = flowy.
    const posEase = 1 - Math.pow(0.12, delta)
    const lookEase = 1 - Math.pow(0.14, delta)

    if (isWide.current) {
      // Pull far back above the galaxy and slowly arc across it.
      const galaxyRadius = 6 * Math.sqrt(count)
      const orbit = t * 0.05
      const dist = galaxyRadius * 1.55 + 26
      desiredPos.current.set(
        Math.cos(orbit) * dist,
        galaxyRadius * 0.7 + 28,
        Math.sin(orbit) * dist,
      )
      lookAt.current.lerp(new THREE.Vector3(0, 0, 0), lookEase)
    } else {
      const anchor = anchors[targetIndex.current]
      const [px, py, pz] = planetPosition(targetIndex.current, anchor.seed)
      lookAt.current.lerp(new THREE.Vector3(px, py, pz), lookEase)

      // Camera sits at a slowly orbiting offset; distance varies per visit, and
      // closer shots sit lower for a more intimate framing.
      const orbit = t * 0.1
      const dist = distLevel.current * zoom
      desiredPos.current.set(
        px + Math.cos(orbit) * dist,
        py + dist * 0.35 + Math.sin(t * 0.08) * 2,
        pz + Math.sin(orbit) * dist,
      )
    }

    camera.position.lerp(desiredPos.current, posEase)
    camera.lookAt(lookAt.current)
  })

  return null
}
