import { useState, useEffect } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fmtCurrency, toMonthly, downloadCSV } from '@/lib/format';

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

interface DangerModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DeleteAccountModal({ onConfirm, onCancel, loading }: DangerModalProps) {
  const [confirm, setConfirm] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(8px)', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 28, padding: 40, maxWidth: 440, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, marginBottom: 8, color: '#dc2626' }}>Delete Account</div>
        <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 24, lineHeight: 1.7 }}>
          This will permanently delete your account and all your subscription data. This action <strong>cannot be undone</strong>.
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--sz-gray-700)', marginBottom: 8, fontWeight: 600 }}>
            Type <strong>DELETE</strong> to confirm
          </div>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="DELETE"
            style={{ width: '100%', border: '1.5px solid #FECACA', borderRadius: 12, padding: '12px 16px', fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} className="sz-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={confirm !== 'DELETE' || loading}
            style={{
              flex: 1, background: confirm === 'DELETE' ? '#dc2626' : 'var(--sz-gray-200)',
              color: confirm === 'DELETE' ? 'white' : 'var(--sz-gray-500)', border: 'none',
              padding: '13px', borderRadius: 100, fontSize: 15, fontWeight: 600,
              cursor: confirm === 'DELETE' && !loading ? 'pointer' : 'not-allowed',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s'
            }}
          >
            {loading ? 'Deleting…' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, isDemoMode, signOut } = useAuth();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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
      if (isDemoMode) {
        toast.success('Profile updated (demo session)');
        return;
      }
      await supabase.auth.updateUser({ data: { full_name: profile.full_name } });
      await supabase.from('users').update({ full_name: profile.full_name, currency: profile.currency }).eq('user_id', user!.id);
      toast.success('Profile updated');
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
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleExportCSV = () => {
    if (subscriptions.length === 0) {
      toast.error('No subscriptions to export');
      return;
    }
    const rows = [
      ['Name', 'Category', 'Cost', 'Billing Cycle', 'Monthly Cost', 'Usage Frequency', 'Next Renewal', 'Notes'],
      ...subscriptions.map(s => [
        s.name,
        s.category,
        String(s.cost),
        s.billing_cycle,
        String(Math.round(toMonthly(s.cost, s.billing_cycle))),
        s.usage_frequency,
        s.next_renewal_date || '',
        s.notes || '',
      ]),
    ];
    downloadCSV(`subzero-subscriptions-${new Date().toISOString().split('T')[0]}.csv`, rows);
    toast.success(`Exported ${subscriptions.length} subscriptions as CSV`);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      if (isDemoMode) {
        localStorage.removeItem('sz_offline_subscriptions');
        localStorage.removeItem('sz_offline_settings');
        localStorage.removeItem('sz_demo_mode');
        await signOut();
        window.location.href = '/';
        return;
      }
      // Delete user data from Supabase tables
      await supabase.from('subscriptions').delete().eq('user_id', user!.id);
      await supabase.from('ai_insights').delete().eq('user_id', user!.id);
      await supabase.from('user_settings').delete().eq('user_id', user!.id);
      await supabase.from('users').delete().eq('user_id', user!.id);
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete account. Please contact support.');
      setDeletingAccount(false);
    }
  };

  // Compute total monthly spend for display
  const totalMonthly = subscriptions.reduce((sum, s) => sum + toMonthly(s.cost, s.billing_cycle), 0);

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        <div style={{ maxWidth: 700 }}>
          <div style={{ marginBottom: 32 }}>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">Settings</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">Manage your account and preferences</div>
          </div>

          {/* Quick Stats */}
          <div className="sz-fade-in sz-fade-in-1" style={{ background: 'var(--sz-black)', borderRadius: 20, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'Subscriptions', value: subscriptions.length },
              { label: 'Monthly Spend', value: fmtCurrency(totalMonthly) },
              { label: 'AI Insights', value: insights.length },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: 'white' }}>{s.value}</div>
              </div>
            ))}
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

          {/* Data & Export */}
          <div className="sz-settings-section sz-fade-in sz-fade-in-3">
            <div className="sz-settings-header">Data & Export</div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 16, lineHeight: 1.7 }}>
                Export all your subscription data as a CSV file. You can open it in Excel, Google Sheets, or any spreadsheet app.
              </div>
              <button
                className="sz-btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                onClick={handleExportCSV}
              >
                📥 Export {subscriptions.length} Subscriptions as CSV
              </button>
            </div>
          </div>

          {/* Account */}
          <div className="sz-settings-section sz-fade-in sz-fade-in-4">
            <div className="sz-settings-header">Account</div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 20 }}>
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

          {/* Danger Zone */}
          <div className="sz-settings-section sz-fade-in sz-fade-in-4" style={{ border: '1.5px solid #FECACA' }}>
            <div className="sz-settings-header" style={{ color: '#dc2626', borderBottomColor: '#FECACA' }}>⚠️ Danger Zone</div>
            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Delete Account</div>
                  <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', lineHeight: 1.6 }}>
                    Permanently delete your account and all associated data. This cannot be undone.
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    background: '#FEF2F2', color: '#dc2626', border: '1.5px solid #FECACA',
                    padding: '10px 20px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', flexShrink: 0
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.background = '#dc2626'; (e.currentTarget).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget).style.background = '#FEF2F2'; (e.currentTarget).style.color = '#dc2626'; }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          loading={deletingAccount}
        />
      )}
    </div>
  );
}
