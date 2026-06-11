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
        </div>
      </main>
    </div>
  )
}
