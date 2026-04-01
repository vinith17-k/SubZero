import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const navItems = [
  {
    label: 'Dashboard', path: '/dashboard',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
  },
  {
    label: 'Subscriptions', path: '/subscriptions',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9ZM8 5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 8 5Z"/></svg>
  },
  {
    label: 'AI Insights', path: '/insights',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0-4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0-4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Z"/></svg>,
    badge: true
  },
  {
    label: 'Analytics', path: '/analytics',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3Zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7ZM11 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V3Z"/></svg>
  },
  {
    label: 'Settings', path: '/settings',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492ZM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0Z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319Z"/></svg>
  },
];

interface SidebarProps {
  insightCount?: number;
}

export default function Sidebar({ insightCount = 0 }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const name = (user?.user_metadata?.full_name as string) || user?.email || 'User';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch {
      toast.error('Sign out failed');
    }
  };

  return (
    <div className="sz-sidebar">
      {/* Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px 24px', cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        <div style={{ width: 30, height: 30, background: '#0A0A0A', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, fill: 'white' }}>
            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" />
          </svg>
        </div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: '#0A0A0A' }}>SubZero</span>
      </div>

      <div className="sz-sidebar-section-label">Overview</div>
      {navItems.map(item => (
        <div
          key={item.path}
          className={`sz-sidebar-item ${location.pathname === item.path ? 'sz-active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          {item.label}
          {item.badge && insightCount > 0 && (
            <span className="sz-sidebar-badge">{insightCount}</span>
          )}
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User + Sign Out */}
      <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--sz-gray-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 12px' }}>
          <div className="sz-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--sz-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', background: 'none', border: '1.5px solid #FECACA', borderRadius: 10,
            padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#dc2626',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s'
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = '#FEF2F2'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
