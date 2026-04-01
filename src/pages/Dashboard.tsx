import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#0A0A0A', Productivity: '#4A4A44', Music: '#1DB954',
  Design: '#F24E1E', Cloud: '#0078D4', Health: '#16a34a',
  Education: '#7c3aed', News: '#8A8A82', Other: '#E8541A'
};

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
  return `₹${Math.round(n)}`;
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: subscriptions = [], getMonthly, totalMonthly, deleteSubscription } = useSubscriptions();
  const { data: insights = [], dismissInsight, totalSavings } = useInsights(subscriptions);

  const name = (user?.user_metadata?.full_name as string) || user?.email || 'there';
  const firstName = name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const now = new Date();
  const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Upcoming renewals (next 30 days)
  const upcoming = [...subscriptions]
    .filter(s => s.next_renewal_date && daysUntil(s.next_renewal_date) <= 30 && daysUntil(s.next_renewal_date) >= 0)
    .sort((a, b) => daysUntil(a.next_renewal_date) - daysUntil(b.next_renewal_date))
    .slice(0, 4);

  // Category breakdown for chart
  const byCategory = subscriptions.reduce<Record<string, number>>((acc, s) => {
    const cat = s.category || 'Other';
    acc[cat] = (acc[cat] || 0) + getMonthly(s);
    return acc;
  }, {});
  const chartData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  // Cancel candidates
  const candidates = subscriptions
    .filter(s => s.usage_frequency === 'never' || s.usage_frequency === 'rare')
    .slice(0, 3);

  const handleMarkCancellation = async (id: string, name: string) => {
    try {
      await deleteSubscription.mutateAsync(id);
      toast.success(`${name} cancelled ✓`);
    } catch {
      toast.error('Could not update subscription');
    }
  };

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">{greeting}, {firstName} ✦</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">Here's your subscription overview for {monthYear}</div>
          </div>
          <div className="sz-avatar sz-fade-in sz-fade-in-1">
            {firstName.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Stats grid */}
        <div className="sz-stats-grid">
          <div className="sz-stat-card sz-fade-in sz-fade-in-1">
            <div className="sz-stat-label">Monthly Spend</div>
            <div className="sz-stat-value">{fmtCurrency(totalMonthly)}</div>
            <div className="sz-stat-change sz-change-up">{subscriptions.length} active subscriptions</div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-2">
            <div className="sz-stat-label">Yearly Projection</div>
            <div className="sz-stat-value">{fmtCurrency(totalMonthly * 12)}</div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>{subscriptions.length} services tracked</div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-3" style={{ background: 'var(--sz-black)' }}>
            <div className="sz-stat-label" style={{ color: 'rgba(255,255,255,0.4)' }}>Savings Potential</div>
            <div className="sz-stat-value" style={{ color: 'var(--sz-accent)' }}>{fmtCurrency(totalSavings / 12)}</div>
            <div className="sz-stat-change" style={{ color: 'rgba(255,255,255,0.4)' }}>From {insights.length} AI insights</div>
          </div>
        </div>

        {/* Dashboard grid */}
        <div className="sz-dashboard-grid">
          {/* Spending Breakdown chart */}
          <div className="sz-card sz-fade-in sz-fade-in-2">
            <div style={{ padding: '24px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sz-card-title">Spending Breakdown</div>
                <div className="sz-card-subtitle">By category · {monthYear}</div>
              </div>
            </div>
            {chartData.length > 0 ? (
              <div style={{ padding: '0 16px 20px', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A8A82' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [`₹${v}`, 'Monthly']}
                      contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 10, color: 'white', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}
                      fill="#0A0A0A"
                      label={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--sz-gray-500)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                <div>Add subscriptions to see breakdown</div>
              </div>
            )}
          </div>

          {/* Next Renewals */}
          <div className="sz-card sz-fade-in sz-fade-in-3" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 0' }}>
              <div className="sz-card-title">Next Renewals</div>
              <div className="sz-card-subtitle">Coming up soon</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {upcoming.length === 0 ? (
                <div style={{ padding: '20px 24px', color: 'var(--sz-gray-500)', fontSize: 14 }}>No upcoming renewals in 30 days</div>
              ) : upcoming.map(r => {
                const days = daysUntil(r.next_renewal_date);
                const dot = days <= 3 ? '#dc2626' : days <= 7 ? '#f59e0b' : '#16a34a';
                return (
                  <div key={r.id} className="sz-sub-list-item">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <div className="sz-sub-details">
                      <div className="sz-name">{r.name}</div>
                      <div className="sz-meta">Renews in {days} day{days !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="sz-sub-price" style={{ color: days <= 3 ? '#dc2626' : undefined }}>
                      {fmtCurrency(getMonthly(r))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* All Subscriptions */}
        <div className="sz-section-tag sz-fade-in sz-fade-in-3">
          <div>
            <div className="sz-card-title" style={{ fontSize: 20, letterSpacing: -0.5 }}>All Subscriptions</div>
            <div className="sz-card-subtitle">{subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''} tracked</div>
          </div>
          <button className="sz-btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} onClick={() => navigate('/subscriptions')}>
            + Add New
          </button>
        </div>

        <div className="sz-card sz-fade-in sz-fade-in-4" style={{ marginBottom: 28 }}>
          {subscriptions.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--sz-gray-500)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>No subscriptions yet</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>Add your first subscription to get started</div>
              <button className="sz-btn-primary" style={{ fontSize: 14, padding: '10px 24px' }} onClick={() => navigate('/subscriptions')}>
                Add Subscription →
              </button>
            </div>
          ) : subscriptions.slice(0, 8).map(sub => {
            const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
            const bg = sub.icon_color || '#0A0A0A';
            const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
            const monthly = getMonthly(sub);
            const badgeClass = sub.usage_frequency === 'never' || sub.usage_frequency === 'rare' ? 'sz-badge-unused' : monthly > 1000 ? 'sz-badge-expensive' : 'sz-badge-ok';
            const badgeText = sub.usage_frequency === 'never' || sub.usage_frequency === 'rare' ? 'Low use' : monthly > 1000 ? 'High cost' : 'Active';
            return (
              <div key={sub.id} className="sz-sub-list-item">
                <div className="sz-sub-logo" style={{ background: isEmoji ? 'var(--sz-gray-100)' : bg }}>
                  <span style={{ fontSize: isEmoji ? 18 : 13, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
                </div>
                <div className="sz-sub-details">
                  <div className="sz-name">{sub.name}</div>
                  <div className="sz-meta">{sub.category} · {sub.billing_cycle.charAt(0).toUpperCase() + sub.billing_cycle.slice(1)} · {sub.usage_frequency.charAt(0).toUpperCase() + sub.usage_frequency.slice(1)}</div>
                </div>
                <span className={`sz-sub-badge ${badgeClass}`}>{badgeText}</span>
                <div className="sz-sub-price">{fmtCurrency(monthly)}</div>
              </div>
            );
          })}
        </div>

        {/* Cancel Candidates */}
        {candidates.length > 0 && (
          <>
            <div className="sz-section-tag sz-fade-in sz-fade-in-4">
              <div>
                <div className="sz-card-title" style={{ fontSize: 20, letterSpacing: -0.5 }}>Cancel Candidates</div>
                <div className="sz-card-subtitle">AI-identified subscriptions you should consider cancelling</div>
              </div>
            </div>
            <div className="sz-cancel-grid sz-fade-in sz-fade-in-5">
              {candidates.map(sub => {
                const monthly = getMonthly(sub);
                const reason = sub.usage_frequency === 'never'
                  ? `You haven't used ${sub.name} at all. This is wasted money.`
                  : `${sub.name} has very low usage. Consider if it's worth the cost.`;
                return (
                  <div key={sub.id} className="sz-cancel-card">
                    <div className="sz-cancel-badge">Cancel Recommended</div>
                    <div className="sz-cancel-name">{sub.name}</div>
                    <div className="sz-cancel-reason">{reason}</div>
                    <div className="sz-cancel-cost">{fmtCurrency(monthly)}/mo</div>
                    <button className="sz-cancel-btn" onClick={() => handleMarkCancellation(sub.id, sub.name)}>
                      Mark for Cancellation
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
