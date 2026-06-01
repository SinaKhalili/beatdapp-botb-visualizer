import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type Phase = 'idle' | 'transmitting' | 'done'

const TARGET_SECONDS = 45
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function fmt(sec: number) {
  const s = Math.max(0, Math.ceil(sec))
  return `00:${String(s).padStart(2, '0')}`
}

// Shared upload flow. `alienify` controls whether the photo is run through the
// OpenAI alien transform (with the transmission sequence) or added as-is.
export function PhotoUploader({ alienify }: { alienify: boolean }) {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl)
  const addUploadedPhoto = useMutation(api.photos.addUploadedPhoto)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [photoId, setPhotoId] = useState<Id<'photos'> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Only the alienify flow waits on the transform status.
  const photo = useQuery(
    api.photos.getPhoto,
    photoId && alienify ? { photoId } : 'skip',
  )

  useEffect(() => {
    if (phase !== 'transmitting') return
    const start = performance.now()
    const id = setInterval(() => {
      setElapsed((performance.now() - start) / 1000)
    }, 200)
    return () => clearInterval(id)
  }, [phase])

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
    if (f && !ALLOWED_TYPES.includes(f.type)) {
      setError('Please choose a JPG, PNG, or WebP image.')
      setFile(null)
      setPreview(null)
      return
    }
    if (f && f.size > MAX_UPLOAD_BYTES) {
      setError('That image is over 10 MB — please pick a smaller one.')
      setFile(null)
      setPreview(null)
      return
    }
    setError(null)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (alienify) setPhase('transmitting')
    else setBusy(true)
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
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      const id = await addUploadedPhoto({
        name: name.trim() || 'Anonymous',
        company: company.trim() || 'Unknown World',
        storageId,
        transform: alienify,
      })
      setPhotoId(id)
      if (!alienify) setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('idle')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setName('')
    setCompany('')
    setPhase('idle')
    setBusy(false)
    setPhotoId(null)
    setElapsed(0)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Transmission sequence (alienify only) ──────────────────────────
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
            {preview && <img src={preview} alt="" className="transmit-img" />}
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

  // ── Done / reveal ──────────────────────────────────────────────────
  if (phase === 'done') {
    const resultImg = alienify ? photo?.imageUrl : preview
    return (
      <div className="landing-root">
        <div className="landing-grain" />
        <main className="upload-content">
          <h1 className="upload-title">
            {alienify ? 'Transmission Complete' : 'Beamed Aboard'}
          </h1>
          <div className="reveal-frame">
            {resultImg && (
              <img src={resultImg} alt="result" className="reveal-img" />
            )}
            <div className="reveal-sweep" />
          </div>
          <p className="reveal-label">
            {name.trim() || 'Anonymous'}
            <span> · {company.trim() || 'Unknown World'}</span>
          </p>
          {alienify && photo?.status === 'failed' && (
            <p className="upload-error">(signal garbled — showing your original)</p>
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
        <h1 className="upload-title">{alienify ? 'Alienify' : 'Add a World'}</h1>
        <p className="upload-subtitle">
          {alienify
            ? 'Turn your photo into a psychedelic alien'
            : 'Add your photo to the galaxy as-is'}
        </p>

        <form className="upload-form" onSubmit={onSubmit}>
          <label className="upload-drop">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickFile}
              hidden
            />
            {preview ? (
              <img src={preview} alt="preview" className="upload-preview" />
            ) : (
              <span className="upload-drop-hint">
                Tap to choose a photo
                <br />
                <small>JPG, PNG or WebP · max 10 MB</small>
              </span>
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
            disabled={!file || busy}
          >
            <span className="landing-btn-label">
              {alienify
                ? 'Beam Aboard'
                : busy
                  ? 'Adding…'
                  : 'Add to Galaxy'}
            </span>
          </button>

          <Link
            to={alienify ? '/upload' : '/alienify'}
            className="upload-back"
          >
            {alienify ? 'Just upload (no alien) →' : 'Alienify me 👽 →'}
          </Link>
          <Link to="/" className="upload-back">
            ← Home
          </Link>
        </form>
      </main>
    </div>
  )
}
