import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AuthPage() {
  const { user, signIn, signUp, enterDemoMode } = useAuth();
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
        toast.success('Account created! Welcome to SubZero.');
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      // Network/Supabase down — suggest demo mode
      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network') || message.toLowerCase().includes('failed')) {
        toast.error('Could not reach server. Try Demo Mode to explore the app offline.', { duration: 6000 });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    enterDemoMode();
    navigate('/dashboard');
  };

  return (
    <div className="sz-auth-page">
      <div className="sz-auth-card" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, background: '#0A0A0A', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
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
                  fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', padding: 4,
                  fontFamily: "'DM Sans', sans-serif",
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
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
            {loading ? (tab === 'signup' ? 'Creating account...' : 'Signing in...') : tab === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#8A8A82' }}>
          {tab === 'login'
            ? <><span>No account? </span><button onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', color: '#E8541A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign up free</button></>
            : <><span>Already have an account? </span><button onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: '#E8541A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign in</button></>
          }
        </div>

        {/* Demo Mode Divider */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--sz-gray-200)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--sz-gray-400)', marginBottom: 12 }}>
            No account needed
          </div>
          <button
            onClick={handleDemoMode}
            style={{
              width: '100%', background: 'var(--sz-gray-100)', color: '#0A0A0A',
              border: '1.5px solid var(--sz-gray-200)', padding: '13px',
              borderRadius: 14, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget).style.background = 'var(--sz-gray-200)'; }}
            onMouseLeave={e => { (e.currentTarget).style.background = 'var(--sz-gray-100)'; }}
          >
            Try Demo Mode
          </button>
          <div style={{ fontSize: 11, color: 'var(--sz-gray-400)', marginTop: 8 }}>
            Explore the app with sample data. No sign-up required.
          </div>
        </div>
      </div>
    </div>
  );
}
