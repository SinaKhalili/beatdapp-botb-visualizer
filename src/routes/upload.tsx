import { Link, createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

type Status = 'idle' | 'uploading' | 'done' | 'error'

function UploadPage() {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl)
  const addUploadedPhoto = useMutation(api.photos.addUploadedPhoto)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setStatus('uploading')
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
      await addUploadedPhoto({
        name: name.trim() || 'Anonymous',
        company: company.trim() || 'Unknown World',
        storageId,
      })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setName('')
    setCompany('')
    setStatus('idle')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (status === 'done') {
    return (
      <div className="landing-root">
        <div className="landing-grain" />
        <main className="upload-content">
          <h1 className="upload-title">Launched! 🚀</h1>
          <p className="upload-done-text">
            A new world is now orbiting the BOTB Universe.
          </p>
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
            disabled={!file || status === 'uploading'}
          >
            <span className="landing-btn-label">
              {status === 'uploading' ? 'Launching…' : 'Launch into the Universe'}
            </span>
          </button>

          <Link to="/" className="upload-back">
            ← Back
          </Link>
        </form>
      </main>
    </div>
  )
}
