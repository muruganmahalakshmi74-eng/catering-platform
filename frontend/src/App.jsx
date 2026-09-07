import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { AuthContext } from './context/AuthContext'
import { useToast } from './context/ToastContext'
import './App.css'

function RequireAuth({ children }) {
  const { user, token } = useContext(AuthContext)
  const location = useLocation()

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}

function App() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogout = () => {
    logout()
    toast.info('You have been logged out.')
    navigate('/login')
  }

  const restaurantName = user?.restaurant?.name

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          <h1>Catering Platform</h1>
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          {!user ? (
            <Link to="/login">Login</Link>
          ) : (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <span style={{ opacity: 0.75, fontSize: '0.85rem' }}>
                {user.name}{restaurantName ? ` · ${restaurantName}` : ''}
              </span>
              <button className="btn-secondary" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </nav>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
