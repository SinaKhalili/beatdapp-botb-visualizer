import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

type Phase = 'idle' | 'transmitting' | 'done'

const TARGET_SECONDS = 45

function fmt(sec: number) {
  const s = Math.max(0, Math.ceil(sec))
  return `00:${String(s).padStart(2, '0')}`
}

function UploadPage() {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl)
  const addUploadedPhoto = useMutation(api.photos.addUploadedPhoto)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [photoId, setPhotoId] = useState<Id<'photos'> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Subscribe to the photo so we know when the alien transform lands.
  const photo = useQuery(
    api.photos.getPhoto,
    photoId ? { photoId } : 'skip',
  )

  // Tick the transmission timer while we wait.
  useEffect(() => {
    if (phase !== 'transmitting') return
    const start = performance.now()
    const id = setInterval(() => {
      setElapsed((performance.now() - start) / 1000)
    }, 200)
    return () => clearInterval(id)
  }, [phase])

  // Reveal once the backend reports ready (or failed → show the original).
  useEffect(() => {
    if (
      phase === 'transmitting' &&
      (photo?.status === 'ready' || photo?.status === 'failed')
    ) {
      setPhase('done')
    }
  }, [phase, photo?.status])

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setPhase('transmitting')
    setElapsed(0)
    setError(null)
    try {
      const uploadUrl = await generateUploadUrl()
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error(`upload failed (${res.status})`)
      const { storageId } = (await res.json()) as {
        storageId: Id<'_storage'>
      }
      const id = await addUploadedPhoto({
        name: name.trim() || 'Anonymous',
        company: company.trim() || 'Unknown World',
        storageId,
      })
      setPhotoId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('idle')
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setName('')
    setCompany('')
    setPhase('idle')
    setPhotoId(null)
    setElapsed(0)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Transmission sequence ──────────────────────────────────────────
  if (phase === 'transmitting') {
    const ready = photo?.status === 'ready' || photo?.status === 'failed'
    const pct = ready ? 100 : Math.min(96, (elapsed / TARGET_SECONDS) * 100)
    const remaining = TARGET_SECONDS - elapsed
    const statusText =
      pct < 25
        ? 'Establishing subspace uplink'
        : pct < 55
          ? 'Transmitting to deep space'
          : pct < 85
            ? 'Decoding alien signal'
            : 'Materializing lifeform'

    return (
      <div className="landing-root">
        <div className="landing-grain" />
        <main className="transmit">
          <div className="transmit-viewport">
            {preview && (
              <img src={preview} alt="" className="transmit-img" />
            )}
            <div className="transmit-grid" />
            <div className="transmit-scan" />
            <div className="transmit-flicker" />
            <span className="transmit-corner tl" />
            <span className="transmit-corner tr" />
            <span className="transmit-corner bl" />
            <span className="transmit-corner br" />
          </div>

          <div className="transmit-status">
            ▌ {statusText}
            <span className="transmit-dots" />
          </div>

          <div className="transmit-bar">
            <div className="transmit-bar-fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="transmit-meta">
            <span>{remaining > 0 ? fmt(remaining) : 'FINALIZING'}</span>
            <span>{Math.round(pct)}%</span>
          </div>
        </main>
      </div>
    )
  }

  // ── Reveal ─────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="landing-root">
        <div className="landing-grain" />
        <main className="upload-content">
          <h1 className="upload-title">Transmission Complete</h1>
          <div className="reveal-frame">
            {photo?.imageUrl && (
              <img src={photo.imageUrl} alt="alien" className="reveal-img" />
            )}
            <div className="reveal-sweep" />
          </div>
          <p className="reveal-label">
            {photo?.name}
            <span> · {photo?.company}</span>
          </p>
          {photo?.status === 'failed' && (
            <p className="upload-error">
              (signal garbled — showing your original)
            </p>
          )}
          <div className="landing-actions">
            <Link to="/universe" className="landing-btn landing-btn--primary">
              <span className="landing-btn-label">See it</span>
              <span className="landing-btn-note">Open the galaxy</span>
            </Link>
            <button
              type="button"
              className="landing-btn"
              onClick={reset}
              style={{ color: '#d8c8ff' }}
            >
              <span className="landing-btn-label">Add another</span>
              <span className="landing-btn-note">Upload again</span>
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────
  return (
    <div className="landing-root">
      <div className="landing-grain" />
      <main className="upload-content">
        <h1 className="upload-title">Add a World</h1>

        <form className="upload-form" onSubmit={onSubmit}>
          <label className="upload-drop">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              hidden
            />
            {preview ? (
              <img src={preview} alt="preview" className="upload-preview" />
            ) : (
              <span className="upload-drop-hint">Tap to choose a photo</span>
            )}
          </label>

          <input
            className="upload-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="upload-input"
            placeholder="Company / community"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />

          {error && <p className="upload-error">{error}</p>}

          <button
            type="submit"
            className="landing-btn landing-btn--primary upload-submit"
            disabled={!file}
          >
            <span className="landing-btn-label">Beam Aboard</span>
          </button>

          <Link to="/" className="upload-back">
            ← Back
          </Link>
        </form>
      </main>
    </div>
  )
}
