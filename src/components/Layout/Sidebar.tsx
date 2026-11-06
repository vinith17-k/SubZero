import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';

interface NavItem {
  label: string;
  path: string;
  icon: JSX.Element;
  badge?: boolean;
  section: 'OVERVIEW' | 'INSIGHTS' | 'ACCOUNT';
}

const navSections: Array<{ key: 'OVERVIEW' | 'INSIGHTS' | 'ACCOUNT'; title: string }> = [
  { key: 'OVERVIEW', title: 'OVERVIEW' },
  { key: 'INSIGHTS', title: 'INSIGHTS' },
  { key: 'ACCOUNT', title: 'ACCOUNT' },
];

const navItems: NavItem[] = [
  {
    label: 'Dashboard', path: '/dashboard', section: 'OVERVIEW',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
  },
  {
    label: 'Subscriptions', path: '/subscriptions', section: 'OVERVIEW',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9ZM8 5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 8 5Z"/></svg>
  },
  {
    label: 'AI Insights', path: '/insights', section: 'INSIGHTS', badge: true,
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0-4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0-4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Z"/></svg>
  },
  {
    label: 'Analytics', path: '/analytics', section: 'INSIGHTS',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3Zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7ZM11 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V3Z"/></svg>
  },
  {
    label: 'Settings', path: '/settings', section: 'ACCOUNT',
    icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492ZM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0Z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319Z"/></svg>
  },
];

interface SidebarProps {
  insightCount?: number;
}

export default function Sidebar({ insightCount = 0 }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isDemoMode } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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
    <div className={`sz-sidebar ${collapsed ? 'sz-collapsed' : ''}`}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: '0 4px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')} title="SubZero">
          <div style={{ width: 32, height: 32, background: '#0A0A0A', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, fill: 'white' }}>
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" />
            </svg>
          </div>
          {!collapsed && (
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 900, color: '#0A0A0A' }}>SubZero</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AnimatedThemeToggler variant="circle" />
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sz-gray-700)', transition: 'all 0.2s' }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
              <path d="M10.22 3.22a.75.75 0 0 1 1.06 1.06L7.56 8l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && !collapsed && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 3 }}>Demo Mode</div>
          <div style={{ color: '#B45309', lineHeight: 1.4, marginBottom: 8 }}>Data is not saved. Create an account to keep your subs.</div>
          <button
            onClick={() => navigate('/auth')}
            style={{ background: '#0A0A0A', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: "'DM Sans', sans-serif" }}
          >
            Create Free Account
          </button>
        </div>
      )}
      {isDemoMode && collapsed && (
        <div title="Demo Mode — data not saved" style={{ width: 8, height: 8, background: '#F59E0B', borderRadius: '50%', margin: '0 auto 12px' }} />
      )}

      {/* Nav Sections */}
      {navSections.map(sec => {
        const items = navItems.filter(i => i.section === sec.key);
        if (items.length === 0) return null;
        return (
          <div key={sec.key} style={{ marginBottom: 12 }}>
            <div className="sz-sidebar-section-label">{sec.title}</div>
            {items.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <div
                  key={item.path}
                  className={`sz-sidebar-item ${isActive ? 'sz-active' : ''}`}
                  onClick={() => navigate(item.path)}
                  data-tooltip={item.label}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                  {item.badge && insightCount > 0 && (
                    <span className="sz-sidebar-badge" style={collapsed ? { position: 'absolute', top: 4, right: 4 } : {}}>
                      {insightCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* User + Sign Out */}
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(226, 225, 220, 0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '0 0 12px' : '0 4px 12px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div className="sz-avatar" style={{ width: 32, height: 32, fontSize: 12 }} title={name}>{initials}</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isDemoMode ? 'Demo User' : name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--sz-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isDemoMode ? 'demo@subzero.app' : user?.email}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          title="Sign Out"
          style={{ width: '100%', background: 'none', border: '1.5px solid #FECACA', borderRadius: 10, padding: collapsed ? '8px 0' : '8px 12px', fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
            <path fillRule="evenodd" d="M3 3.5A1.5 1.5 0 0 1 4.5 2h4a.75.75 0 0 1 0 1.5h-4a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h4a.75.75 0 0 1 0 1.5h-4A1.5 1.5 0 0 1 3 12.5v-9Zm7.78 2.03a.75.75 0 0 0-1.06 1.06L11.44 8l-1.72 1.72a.75.75 0 1 0 1.06 1.06l2-2a.75.75 0 0 0 0-1.06l-2-2Z" />
          </svg>
          {!collapsed && <span>{isDemoMode ? 'Exit Demo' : 'Sign Out'}</span>}
        </button>
      </div>
    </div>
  );
}
