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
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields.'); return; }
    if (tab === 'signup' && !fullName) { toast.error('Please enter your name.'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }

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
          <circle cx="200" cy="700" r="200" stroke="#E8541A" strokeWidth="0.5" opacity="0.05" />
        </svg>
      </div>

      <div className="sz-auth-card" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, background: '#0A0A0A', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}>
            <svg viewBox="0 0 16 16" style={{ width: 24, height: 24, fill: 'white' }}>
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
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                className="sz-field-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sz-gray-500)',
                  fontSize: 18, lineHeight: 1, padding: 4
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? 'var(--sz-gray-700)' : '#0A0A0A', color: 'white', border: 'none',
              padding: '15px', borderRadius: 14, fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}
          >
            {loading && (
              <span style={{
                width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white', borderRadius: '50%',
                animation: 'sz-spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0
              }} />
            )}
            {loading ? (tab === 'signup' ? 'Creating account…' : 'Signing in…') : tab === 'signup' ? 'Create Account →' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#8A8A82' }}>
          {tab === 'login'
            ? <><span>No account? </span><button onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', color: '#E8541A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign up free</button></>
            : <><span>Already have an account? </span><button onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: '#E8541A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign in</button></>
          }
        </div>

        <div style={{ marginTop: 28, padding: '16px 0 0', borderTop: '1px solid var(--sz-gray-200)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--sz-gray-300)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Trusted by</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, opacity: 0.5, fontSize: 13, fontWeight: 600, color: 'var(--sz-gray-700)' }}>
            <span>12k+ Users</span>
            <span>·</span>
            <span>₹2.4Cr Saved</span>
            <span>·</span>
            <span>4.9★ Rating</span>
          </div>
        </div>
      </div>
    </div>
  );
}
