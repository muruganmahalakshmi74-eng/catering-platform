import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEMO_ACCOUNTS = [
  { email: 'admin@spiceparadise.com', label: 'Spice Paradise · admin' },
  { email: 'staff@spiceparadise.com', label: 'Spice Paradise · staff' },
  { email: 'admin@royalfeast.com', label: 'Royal Feast · admin' },
  { email: 'staff@royalfeast.com', label: 'Royal Feast · staff' },
];

export default function Login() {
  const [email, setEmail] = useState('admin@spiceparadise.com');
  const [password, setPassword] = useState('123456');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.warning('Please enter both an email and a password.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });

      login(data, data.token);
      toast.success(`Welcome back, ${data.name}! Signed in to ${data.restaurant?.name}.`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: '2rem auto' }}>
      <h2>Restaurant Login</h2>
      <p className="muted" style={{ marginTop: '0.35rem' }}>
        Sign in to manage your restaurant&apos;s catering menu, packages and orders.
      </p>

      <form onSubmit={handleSubmit} className="stack" style={{ marginTop: '1.25rem', gap: '0.9rem' }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@restaurant.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </div>

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? <><span className="spinner" /> Signing in…</> : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Demo accounts (password: <code>123456</code>) — each sees only its own restaurant:
        </p>
        <div className="row">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              className="btn-secondary"
              onClick={() => { setEmail(account.email); setPassword('123456'); }}
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
