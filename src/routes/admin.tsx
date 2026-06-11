import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
        <button className="admin-btn admin-btn--danger" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  )
}
