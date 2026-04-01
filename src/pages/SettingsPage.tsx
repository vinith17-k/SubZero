import { useState, useEffect } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`sz-toggle ${on ? 'sz-on' : ''}`}
      onClick={onToggle}
      aria-pressed={on}
    />
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: insights = [] } = useInsights(subscriptions);
  const { data: settings, updateSettings } = useUserSettings();

  const [profile, setProfile] = useState({ full_name: '', currency: 'INR' });
  const [notifs, setNotifs] = useState({
    renewal_alerts_enabled: true,
    weekly_summary_enabled: true,
    ai_insights_enabled: true,
    price_change_alerts_enabled: false,
    advance_notice_days: 7,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: (user.user_metadata?.full_name as string) || '',
        currency: 'INR',
      });
    }
  }, [user]);

  useEffect(() => {
    if (settings) {
      setNotifs({
        renewal_alerts_enabled: settings.renewal_alerts_enabled,
        weekly_summary_enabled: settings.weekly_summary_enabled,
        ai_insights_enabled: settings.ai_insights_enabled,
        price_change_alerts_enabled: settings.price_change_alerts_enabled,
        advance_notice_days: settings.advance_notice_days,
      });
    }
  }, [settings]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await supabase.auth.updateUser({ data: { full_name: profile.full_name } });
      await supabase.from('users').update({ full_name: profile.full_name, currency: profile.currency }).eq('user_id', user!.id);
      toast.success('Profile updated ✓');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNotifs = async () => {
    setSavingNotifs(true);
    try {
      await updateSettings.mutateAsync(notifs);
      toast.success('Settings saved ✓');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingNotifs(false);
    }
  };

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        <div style={{ maxWidth: 700 }}>
          <div style={{ marginBottom: 32 }}>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">Settings</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">Manage your account and preferences</div>
          </div>

          {/* Profile Section */}
          <div className="sz-settings-section sz-fade-in sz-fade-in-1">
            <div className="sz-settings-header">Profile</div>
            <div className="sz-settings-row">
              <div>
                <div className="sz-settings-row-label">Full Name</div>
              </div>
              <input
                className="sz-settings-input"
                type="text"
                value={profile.full_name}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="sz-settings-row">
              <div>
                <div className="sz-settings-row-label">Email Address</div>
                <div className="sz-settings-row-desc">Cannot be changed</div>
              </div>
              <input
                className="sz-settings-input"
                type="email"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
            <div className="sz-settings-row">
              <div>
                <div className="sz-settings-row-label">Currency</div>
                <div className="sz-settings-row-desc">Used for displaying amounts</div>
              </div>
              <select className="sz-settings-input" value={profile.currency} onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))}>
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
              </select>
            </div>
            <div style={{ padding: '16px 28px' }}>
              <button className="sz-btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="sz-settings-section sz-fade-in sz-fade-in-2">
            <div className="sz-settings-header">Notifications</div>
            {[
              { key: 'renewal_alerts_enabled', label: 'Renewal Alerts', desc: 'Get notified before subscriptions renew' },
              { key: 'weekly_summary_enabled', label: 'Weekly Summary', desc: 'Receive a weekly spending digest' },
              { key: 'ai_insights_enabled', label: 'AI Insights', desc: 'Notify when new savings opportunities are found' },
              { key: 'price_change_alerts_enabled', label: 'Price Change Alerts', desc: 'Alert when subscription prices increase' },
            ].map(item => (
              <div key={item.key} className="sz-settings-row">
                <div>
                  <div className="sz-settings-row-label">{item.label}</div>
                  <div className="sz-settings-row-desc">{item.desc}</div>
                </div>
                <Toggle
                  on={notifs[item.key as keyof typeof notifs] as boolean}
                  onToggle={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                />
              </div>
            ))}
            <div style={{ padding: '16px 28px' }}>
              <button className="sz-btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} onClick={handleSaveNotifs} disabled={savingNotifs}>
                {savingNotifs ? 'Saving…' : 'Save Notifications'}
              </button>
            </div>
          </div>

          {/* Alert Timing */}
          <div className="sz-settings-section sz-fade-in sz-fade-in-3">
            <div className="sz-settings-header">Alert Timing</div>
            <div className="sz-settings-row">
              <div>
                <div className="sz-settings-row-label">Advance Renewal Notice</div>
                <div className="sz-settings-row-desc">How many days before renewal to alert</div>
              </div>
              <select
                className="sz-settings-input"
                value={notifs.advance_notice_days}
                onChange={e => setNotifs(n => ({ ...n, advance_notice_days: Number(e.target.value) }))}
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>

          {/* Account */}
          <div className="sz-settings-section sz-fade-in sz-fade-in-4">
            <div className="sz-settings-header">Account</div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 16 }}>
                Signed in as <strong>{user?.email}</strong>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  style={{ background: '#dc2626', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                      window.location.href = '/';
                    } catch {
                      toast.error('Sign out failed');
                    }
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
