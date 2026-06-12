import { folder, useControls } from 'leva'

// imgui-style live control panel (leva). Returns a flat config object the scene
// and every effect reads from.
export type VizConfig = {
  enabled: boolean
  bpm: number
  intensity: number
  terrain: boolean
  terrainHeight: number
  beatPulse: boolean
  pulseStrength: number
  shockwaves: boolean
  ribbons: boolean
  ribbonCount: number
  bloom: number
  zoom: number
}

export function useVizControls(): VizConfig {
  return useControls({
    Visualizer: folder({
      enabled: { value: true, label: 'enabled' },
      bpm: { value: 120, min: 60, max: 180, step: 1 },
      intensity: { value: 1, min: 0, max: 2, step: 0.05 },
    }),
    Effects: folder({
      terrain: { value: false, label: 'wave terrain' },
      terrainHeight: { value: 9, min: 0, max: 24, step: 0.5, label: 'terrain height' },
      beatPulse: { value: true, label: 'beat pulses' },
      pulseStrength: { value: 1, min: 0, max: 2, step: 0.05, label: 'pulse strength' },
      shockwaves: { value: true },
      ribbons: { value: true },
      ribbonCount: { value: 3, min: 1, max: 6, step: 1, label: 'ribbon count' },
    }),
    Scene: folder({
      bloom: { value: 0.85, min: 0, max: 2.5, step: 0.05, label: 'bloom' },
    }),
    Camera: folder({
      zoom: { value: 1, min: 0.5, max: 2, step: 0.05, label: 'zoom' },
    }),
  })
}
