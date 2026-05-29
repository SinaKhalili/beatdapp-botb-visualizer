import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="landing-root">
      <div className="landing-grain" />
      <main className="landing-content">
        <h1 className="landing-title">BOTB Universe</h1>

        <div className="landing-actions">
          <Link to="/universe" className="landing-btn landing-btn--primary">
            <span className="landing-btn-label">Universe</span>
            <span className="landing-btn-note">Enter the galaxy</span>
          </Link>

          <button type="button" className="landing-btn landing-btn--disabled" disabled>
            <span className="landing-btn-label">Upload</span>
            <span className="landing-btn-note">(not done yet)</span>
          </button>
        </div>
      </main>
    </div>
  )
}
