import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields.'); return; }
    if (tab === 'signup' && !fullName) { toast.error('Please enter your name.'); return; }

    setLoading(true);
    try {
      if (tab === 'signup') {
        await signUp(email, password, fullName);
        toast.success('Account created! Welcome to SubZero 🧊');
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sz-auth-page">
      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <svg viewBox="0 0 1440 900" style={{ width: '100%', height: '100%' }} fill="none">
          <path d="M-100 600 Q 300 400 700 500 Q 1100 600 1500 300" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.07" />
          <circle cx="1200" cy="150" r="300" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.04" />
        </svg>
      </div>

      <div className="sz-auth-card" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 48, height: 48, background: '#0A0A0A', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <svg viewBox="0 0 16 16" style={{ width: 22, height: 22, fill: 'white' }}>
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" />
            </svg>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, letterSpacing: -1, color: '#0A0A0A' }}>SubZero</div>
          <div style={{ fontSize: 14, color: '#8A8A82', marginTop: 6 }}>
            {tab === 'login' ? 'Sign in to your account' : 'Create your free account'}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="sz-auth-tabs">
          <button
            id="tab-login"
            className={`sz-auth-tab ${tab === 'login' ? 'sz-tab-active' : ''}`}
            onClick={() => setTab('login')}
            type="button"
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            className={`sz-auth-tab ${tab === 'signup' ? 'sz-tab-active' : ''}`}
            onClick={() => setTab('signup')}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div style={{ marginBottom: 16 }}>
              <label className="sz-field-label">Full Name</label>
              <input
                id="auth-name"
                className="sz-field-input"
                type="text"
                placeholder="Your Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="sz-field-label">Email</label>
            <input
              id="auth-email"
              className="sz-field-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label className="sz-field-label">Password</label>
            <input
              id="auth-password"
              className="sz-field-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: '#0A0A0A', color: 'white', border: 'none',
              padding: '15px', borderRadius: 14, fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.25s', opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Please wait…' : tab === 'signup' ? 'Create Account →' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#8A8A82' }}>
          {tab === 'login'
            ? <>No account? <button onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', color: '#E8541A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign up free</button></>
            : <>Already have an account? <button onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: '#E8541A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign in</button></>
          }
        </div>
      </div>
    </div>
  );
}
