import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="landing-root">
      <div className="landing-grain" />
      <main className="landing-content">
        <img
          className="brand-title brand-title--lg"
          src="/brand/botb-title.png"
          alt="BOTB Universe"
        />

        <div className="landing-actions">
          <Link to="/universe" className="landing-btn landing-btn--primary">
            <span className="landing-btn-label">Universe</span>
            <span className="landing-btn-note">Enter the galaxy</span>
          </Link>

          <Link to="/alienify" className="landing-btn landing-btn--primary">
            <span className="landing-btn-label">Alienify</span>
            <span className="landing-btn-note">Become an alien 👽</span>
          </Link>

          <Link to="/upload" className="landing-btn landing-btn--primary">
            <span className="landing-btn-label">Upload</span>
            <span className="landing-btn-note">Add your photo</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
