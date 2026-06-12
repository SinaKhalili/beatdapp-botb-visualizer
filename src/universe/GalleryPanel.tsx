import { useState } from 'react'
import type { ReactNode } from 'react'
import type { PhotoDatum } from './PhotoPlanet'

// Inline SVGs instead of unicode glyphs (⛶/⤓) — those are missing from many
// system fonts and render as blank/tofu.
function ExpandIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8V3h5" />
      <path d="M16 3h5v5" />
      <path d="M21 16v5h-5" />
      <path d="M8 21H3v-5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  )
}

function downloadFilename(p: PhotoDatum): string {
  const label =
    (p.name || p.company || 'world')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'world'
  return `botb-${label}-${p.id.slice(-6)}.webp`
}

// Fetch → blob so the save works even though the image URL is absolute.
async function downloadPhoto(p: PhotoDatum): Promise<void> {
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
}

// Small stateful wrapper so each download button can show a busy state.
function DownloadButton({
  photo,
  className,
  label,
}: {
  photo: PhotoDatum
  className: string
  label?: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      title="Download this photo"
      onClick={() => {
        setBusy(true)
        void downloadPhoto(photo).finally(() => setBusy(false))
      }}
    >
      {busy ? '…' : (label ?? <DownloadIcon />)}
    </button>
  )
}

// Fullscreen enlarged view of one photo. Click the backdrop (or ✕ / Esc — the
// Universe owns the Esc handling) to close.
export function Lightbox({
  photo,
  onClose,
}: {
  photo: PhotoDatum
  onClose: () => void
}) {
  return (
    <div className="lightbox" onClick={onClose}>
      <figure className="lightbox-frame" onClick={(e) => e.stopPropagation()}>
        <img
          className="lightbox-img"
          src={photo.imageUrl}
          alt={photo.name || photo.company}
        />
        <figcaption className="lightbox-caption">
          <span className="gallery-label lightbox-label">
            {photo.name || photo.company}
          </span>
          <div className="lightbox-actions">
            <DownloadButton
              photo={photo}
              className="universe-btn"
              label="Download"
            />
            <button type="button" className="universe-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </figcaption>
      </figure>
    </div>
  )
}

// Scrollable side gallery of every world. Clicking a photo snaps the camera to
// its planet (click again to release); ⛶ opens the enlarged view and ⤓
// downloads the original.
export function GalleryPanel({
  photos,
  open,
  selectedId,
  onSelect,
  onEnlarge,
  onClose,
}: {
  photos: Array<PhotoDatum>
  open: boolean
  selectedId: string | null
  onSelect: (index: number | null) => void
  onEnlarge: (photo: PhotoDatum) => void
  onClose: () => void
}) {
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
                <div className="gallery-actions">
                  <button
                    type="button"
                    className="gallery-download"
                    onClick={() => onEnlarge(p)}
                    title="View enlarged"
                  >
                    <ExpandIcon />
                  </button>
                  <DownloadButton photo={p} className="gallery-download" />
                </div>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </aside>
  )
}
