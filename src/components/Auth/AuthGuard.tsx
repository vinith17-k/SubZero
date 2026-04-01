import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--sz-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, background: '#0A0A0A', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <svg viewBox="0 0 16 16" style={{ width: 22, height: 22, fill: 'white' }}>
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" />
            </svg>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: '#0A0A0A' }}>SubZero</div>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E1DC', borderTopColor: '#0A0A0A', borderRadius: '50%', margin: '20px auto 0', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
