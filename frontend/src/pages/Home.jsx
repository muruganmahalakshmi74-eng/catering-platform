import { useEffect, useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { AuthContext } from '../context/AuthContext'

function Home() {
  const [status, setStatus] = useState('checking')
  const { user } = useContext(AuthContext)

  useEffect(() => {
    let cancelled = false
    api.get('/health')
      .then(() => { if (!cancelled) setStatus('connected') })
      .catch(() => { if (!cancelled) setStatus('disconnected') })
    return () => { cancelled = true }
  }, [])

  const statusColor = { connected: '#16a34a', disconnected: '#dc2626', checking: '#d97706' }[status]

  return (
    <div className="stack">
      <div className="card">
        <h2>Multi-Restaurant Catering Platform</h2>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          A multi-tenant catering backend where each restaurant has its own users, menu items,
          catering packages and orders — with an AI-assisted recommendation engine that only ever
          suggests offerings from the restaurant you are signed in to.
        </p>

        <div className="row" style={{ marginTop: '1.25rem' }}>
          <span>
            Backend:{' '}
            <strong style={{ color: statusColor }}>
              {status === 'checking' ? 'checking…' : status}
            </strong>
          </span>
          {status === 'disconnected' && (
            <span className="muted">Start it with <code>cd backend &amp;&amp; npm run dev</code></span>
          )}
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <Link to={user ? '/dashboard' : '/login'}>
            <button className="btn">{user ? 'Go to dashboard' : 'Login to continue'}</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>What this demo covers</h3>
        <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', lineHeight: 1.9 }}>
          <li>JWT authentication with per-restaurant access control</li>
          <li>Restaurant, menu, catering package and order APIs</li>
          <li>Order validation: guest limits, budget maths and future event dates</li>
          <li>AI-assisted recommendations from a plain-English request</li>
        </ul>
      </div>
    </div>
  )
}

export default Home
