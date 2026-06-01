import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

const PW_KEY = 'botb-admin-pw'

function AdminPage() {
  const [pw, setPw] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const checkPassword = useMutation(api.admin.checkPassword)

  // Auto-unlock from a previously saved password.
  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem(PW_KEY) : null
    if (!saved) return
    void checkPassword({ password: saved }).then((ok) => {
      if (ok) {
        setPw(saved)
        setUnlocked(true)
      } else {
        localStorage.removeItem(PW_KEY)
      }
    })
  }, [checkPassword])

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    const ok = await checkPassword({ password: pw })
    if (ok) {
      localStorage.setItem(PW_KEY, pw)
      setUnlocked(true)
      setAuthError(null)
    } else {
      setAuthError('Wrong password')
    }
  }

  if (!unlocked) {
    return (
      <div className="admin-gate">
        <form className="admin-gate-box" onSubmit={unlock}>
          <h1 className="admin-gate-title">Admin Access</h1>
          <input
            className="admin-input"
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          {authError && <p className="admin-error">{authError}</p>}
          <button className="admin-btn admin-btn--primary" type="submit">
            Unlock
          </button>
          <Link to="/" className="admin-back">
            ← Home
          </Link>
        </form>
      </div>
    )
  }

  return (
    <AdminConsole
      password={pw}
      onLock={() => {
        localStorage.removeItem(PW_KEY)
        setUnlocked(false)
        setPw('')
      }}
    />
  )
}

function AdminConsole({
  password,
  onLock,
}: {
  password: string
  onLock: () => void
}) {
  const photos = useQuery(api.admin.listAll)

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div>
          <h1 className="admin-h1">BOTB Universe · Admin</h1>
          <p className="admin-sub">
            {photos ? `${photos.length} worlds` : 'loading…'}
          </p>
        </div>
        <div className="admin-header-actions">
          <Link to="/universe" className="admin-btn">
            View galaxy
          </Link>
          <button className="admin-btn" onClick={onLock}>
            Lock
          </button>
        </div>
      </header>

      <AddForm />

      <div className="admin-list">
        {photos?.map((p) => (
          <AdminRow key={p.id} photo={p} password={password} />
        ))}
        {photos && photos.length === 0 && (
          <p className="admin-empty">No worlds yet.</p>
        )}
      </div>
    </div>
  )
}

function AddForm() {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl)
  const addUploadedPhoto = useMutation(api.photos.addUploadedPhoto)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [alienify, setAlienify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const url = await generateUploadUrl()
      const res = await fetch(url, {
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
        transform: alienify,
      })
      setName('')
      setCompany('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-add" onSubmit={add}>
      <h2 className="admin-h2">Add a world</h2>
      <div className="admin-add-row">
        <input
          className="admin-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="admin-input"
          placeholder="Company / community"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          ref={fileRef}
          className="admin-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label className="admin-check">
          <input
            type="checkbox"
            checked={alienify}
            onChange={(e) => setAlienify(e.target.checked)}
          />
          Alienify
        </label>
        <button
          className="admin-btn admin-btn--primary"
          type="submit"
          disabled={!file || busy}
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="admin-error">{error}</p>}
    </form>
  )
}

type PhotoRow = {
  id: Id<'photos'>
  name: string
  company: string
  status: 'transforming' | 'ready' | 'failed'
  createdAt: number
  isUpload: boolean
  imageUrl: string | null
}

function AdminRow({
  photo,
  password,
}: {
  photo: PhotoRow
  password: string
}) {
  const update = useMutation(api.admin.update)
  const remove = useMutation(api.admin.remove)
  const retransform = useMutation(api.admin.retransform)
  const [name, setName] = useState(photo.name)
  const [company, setCompany] = useState(photo.company)
  const [busy, setBusy] = useState(false)

  const dirty = name !== photo.name || company !== photo.company

  async function save() {
    setBusy(true)
    try {
      await update({ photoId: photo.id, name, company, password })
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    if (!window.confirm(`Remove "${photo.name}"? This can't be undone.`)) return
    await remove({ photoId: photo.id, password })
  }

  return (
    <div className="admin-row">
      {photo.imageUrl ? (
        <img className="admin-thumb" src={photo.imageUrl} alt="" />
      ) : (
        <div className="admin-thumb admin-thumb--empty" />
      )}
      <input
        className="admin-input admin-input--name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="admin-input"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <span className={`admin-status admin-status--${photo.status}`}>
        {photo.status}
      </span>
      <div className="admin-row-actions">
        {dirty && (
          <button className="admin-btn admin-btn--primary" onClick={save} disabled={busy}>
            Save
          </button>
        )}
        {photo.isUpload && (
          <button
            className="admin-btn"
            onClick={() => retransform({ photoId: photo.id, password })}
            title="Re-run the alien transform"
          >
            Re-alienify
          </button>
        )}
        <button className="admin-btn admin-btn--danger" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  )
}
