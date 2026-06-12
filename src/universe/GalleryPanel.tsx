import { useState } from 'react'
import type { PhotoDatum } from './PhotoPlanet'

function downloadFilename(p: PhotoDatum): string {
  const label =
    (p.name || p.company || 'world')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'world'
  return `botb-${label}-${p.id.slice(-6)}.webp`
}

// Scrollable side gallery of every world. Clicking a photo snaps the camera to
// its planet (click again to release); the ⤓ button downloads the original.
export function GalleryPanel({
  photos,
  open,
  selectedId,
  onSelect,
  onClose,
}: {
  photos: Array<PhotoDatum>
  open: boolean
  selectedId: string | null
  onSelect: (index: number | null) => void
  onClose: () => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function download(p: PhotoDatum) {
    setBusyId(p.id)
    try {
      // Fetch → blob so the save works even though the image URL is absolute.
      const res = await fetch(p.imageUrl)
      if (!res.ok) throw new Error(`download failed (${res.status})`)
      const blobUrl = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = downloadFilename(p)
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  return (
    <aside className="gallery-panel">
      <header className="gallery-head">
        <div>
          <h2 className="gallery-title">Worlds</h2>
          <p className="gallery-sub">
            {photos.length} photos · click one to fly to it
          </p>
        </div>
        <button type="button" className="universe-btn" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="gallery-grid">
        {photos.map((p, i) => {
          const selected = p.id === selectedId
          return (
            <figure
              key={p.id}
              className={`gallery-cell${selected ? ' gallery-cell--selected' : ''}`}
            >
              <button
                type="button"
                className="gallery-thumb-btn"
                onClick={() => onSelect(selected ? null : i)}
                title={
                  selected ? 'Resume the tour' : 'Snap the camera to this world'
                }
              >
                <img
                  className="gallery-thumb"
                  src={p.imageUrl}
                  alt={p.name || p.company}
                  loading="lazy"
                />
              </button>
              <figcaption className="gallery-caption">
                <span className="gallery-label">{p.name || p.company}</span>
                <button
                  type="button"
                  className="gallery-download"
                  onClick={() => void download(p)}
                  disabled={busyId === p.id}
                  title="Download this photo"
                >
                  {busyId === p.id ? '…' : '⤓'}
                </button>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </aside>
  )
}
