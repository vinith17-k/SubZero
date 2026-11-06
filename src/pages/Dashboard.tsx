import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { fmtCurrency, daysUntil, renewalUrgencyColor } from '@/lib/format';
import { isTrial, trialDaysLeft } from '@/lib/subscriptionMeta';
import { NumberTicker } from '@/components/ui/number-ticker';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#E8541A', Productivity: '#0078D4', Music: '#1DB954',
  Design: '#F24E1E', Cloud: '#7c3aed', Health: '#16a34a',
  Education: '#f59e0b', News: '#8A8A82', Other: '#4A4A44'
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    data: allSubs = [], activeSubs, frozenSubs, urgentTrials,
    getMonthly, totalMonthly, deleteSubscription
  } = useSubscriptions();
  const { data: insights = [], totalSavings } = useInsights(allSubs);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Use allSubs for display, activeSubs for charts/totals (excludes frozen)
  const subscriptions = allSubs;

  const name = (user?.user_metadata?.full_name as string) || user?.email || 'there';
  const firstName = name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const now = new Date();
  const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Upcoming renewals (next 30 days) — exclude frozen
  const upcoming = [...activeSubs]
    .filter(s => s.next_renewal_date && daysUntil(s.next_renewal_date) <= 30 && daysUntil(s.next_renewal_date) >= 0)
    .sort((a, b) => daysUntil(a.next_renewal_date) - daysUntil(b.next_renewal_date))
    .slice(0, 4);

  // Category breakdown for chart — active subs only (not frozen)
  const byCategory = activeSubs.reduce<Record<string, number>>((acc, s) => {
    const cat = s.category || 'Other';
    acc[cat] = (acc[cat] || 0) + getMonthly(s);
    return acc;
  }, {});
  const chartData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  // Cancel candidates — active subs only
  const candidates = activeSubs
    .filter(s => s.usage_frequency === 'never' || s.usage_frequency === 'rare')
    .slice(0, 3);

  const handleMarkCancellation = async (id: string, name: string) => {
    try {
      setDeletingId(id);
      await deleteSubscription.mutateAsync(id);
      toast.success(`${name} cancelled ✓`);
    } catch {
      toast.error('Could not update subscription');
    } finally {
      setDeletingId(null);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeSubs.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', background: 'var(--sz-gray-100)', padding: '6px 14px', borderRadius: 100 }}>
                {activeSubs.length} active
              </div>
            )}
            {frozenSubs.length > 0 && (
              <div style={{ fontSize: 13, color: '#1d4ed8', background: '#DBEAFE', padding: '6px 14px', borderRadius: 100, fontWeight: 600 }}>
                ❄️ {frozenSubs.length} frozen
              </div>
            )}
            {urgentTrials.length > 0 && (
              <div style={{ fontSize: 13, color: '#b45309', background: '#FEF9C3', padding: '6px 14px', borderRadius: 100, fontWeight: 600 }}>
                ⏳ {urgentTrials.length} trial ending
              </div>
            )}
            <div className="sz-avatar sz-fade-in sz-fade-in-1" onClick={() => navigate('/settings')}>
              {firstName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Trial urgency banner */}
        {urgentTrials.length > 0 && (
          <div style={{ background: 'linear-gradient(90deg, #FFF7ED, #FFFBEB)', border: '1.5px solid #F59E0B', borderRadius: 16, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }} className="sz-fade-in sz-fade-in-1">
            <span style={{ fontSize: 20 }}>⏳</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>Trial ending soon!</div>
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                {urgentTrials.map(s => s.name).join(', ')} will start charging within 3 days. Check AI Insights.
              </div>
            </div>
            <button className="sz-btn-primary" style={{ fontSize: 13, padding: '8px 16px', background: '#92400E' }} onClick={() => navigate('/insights')}>View Alerts →</button>
          </div>
        )}

        {/* Spend Temperature Gauge (Task 1) */}
        {(() => {
          const wasteSpend = activeSubs
            .filter(s => s.usage_frequency === 'never' || s.usage_frequency === 'rare')
            .reduce((acc, s) => acc + getMonthly(s), 0);
          const wastePct = totalMonthly > 0 ? Math.min(100, Math.round((wasteSpend / totalMonthly) * 100)) : 0;
          const statusText = wastePct < 20 ? 'Optimal Frost · 0-20% Waste' : wastePct < 45 ? 'Cool · Moderate Idle Spend' : wastePct < 70 ? 'Warming · High Unused Spend' : 'Hot Waste Warning · 70%+ Unused';
          const badgeColor = wastePct < 20 ? '#0284C7' : wastePct < 45 ? '#0369A1' : wastePct < 70 ? '#D97706' : '#DC2626';
          const badgeBg = wastePct < 20 ? '#E8F4FB' : wastePct < 45 ? '#E0F2FE' : wastePct < 70 ? '#FEF3C7' : '#FEE2E2';

          return (
            <div className="sz-temp-gauge-card sz-fade-in sz-fade-in-1" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{wastePct < 30 ? '❄️' : wastePct < 60 ? '🌡️' : '🔥'}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sz-black)' }}>Spend Temperature Gauge</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, background: badgeBg, padding: '4px 10px', borderRadius: 100, letterSpacing: '0.04em' }}>
                  {statusText}
                </span>
              </div>
              <div className="sz-temp-gauge-bar">
                <div className="sz-temp-gauge-indicator" style={{ left: `${Math.max(4, Math.min(96, wastePct))}%` }} title={`${wastePct}% of monthly spend is idle/unused`} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--sz-gray-500)', marginTop: 8, fontWeight: 600 }}>
                <span>❄️ Icy Cool (0% Waste)</span>
                <span>🔥 Hot Waste ({fmtCurrency(wasteSpend)}/mo idle)</span>
              </div>
            </div>
          );
        })()}

        {/* Stats grid (Task 4: Card Hierarchy Pass) */}
        <div className="sz-stats-grid">
          <div className="sz-stat-card sz-fade-in sz-fade-in-1">
            <div className="sz-stat-label">Monthly Spend</div>
            <div className="sz-stat-value" style={{ display: 'flex', alignItems: 'baseline' }}>
              <span>₹</span>
              <NumberTicker value={Math.round(totalMonthly)} />
            </div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>
              {activeSubs.length} active subscription{activeSubs.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-2">
            <div className="sz-stat-label">Yearly Projection</div>
            <div className="sz-stat-value" style={{ display: 'flex', alignItems: 'baseline' }}>
              <span>₹</span>
              <NumberTicker value={Math.round(totalMonthly * 12)} />
            </div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>
              {fmtCurrency(totalMonthly * 12 / 12)}/mo average
            </div>
          </div>
          <div className="sz-stat-card sz-glass-card sz-fade-in sz-fade-in-3" style={{ borderLeft: '4px solid #0284C7' }}>
            <div className="sz-stat-label" style={{ color: '#0369A1', fontWeight: 700 }}>Savings Potential ✦</div>
            <div className="sz-stat-value" style={{ color: 'var(--sz-accent)', fontSize: 44, marginTop: 4, display: 'flex', alignItems: 'baseline' }}>
              <span>₹</span>
              <NumberTicker value={Math.round(totalSavings / 12)} />
            </div>
            <div className="sz-stat-change" style={{ color: '#0284C7', fontWeight: 600, marginTop: 10 }}>
              {insights.length} AI insight{insights.length !== 1 ? 's' : ''} action waiting
            </div>
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
              <div style={{ padding: '0 16px 20px', height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 22, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A8A82' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [`₹${v}`, 'Monthly']}
                      contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 10, color: 'white', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#4A4A44' }} formatter={(v: number) => `₹${v}`} />
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || 'var(--temp-hot)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="sz-frost-empty-state" style={{ margin: 24 }}>
                <div className="sz-frost-icon-wrap">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
                  </svg>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: 'var(--sz-black)' }}>No spend data yet</div>
                <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', marginBottom: 16, maxWidth: 260 }}>Add subscriptions to unlock category temperature analysis.</div>
                <button className="sz-btn-primary" style={{ fontSize: 13, padding: '9px 18px' }} onClick={() => navigate('/subscriptions')}>+ Add Subscription</button>
              </div>
            )}
          </div>

          {/* Next Renewals */}
          <div className="sz-card sz-fade-in sz-fade-in-3" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 0' }}>
              <div className="sz-card-title">Next Renewals</div>
              <div className="sz-card-subtitle">Coming up in 30 days</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {upcoming.length === 0 ? (
                <div style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--sz-gray-500)', fontSize: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  <div>No renewals in the next 30 days</div>
                </div>
              ) : upcoming.map(r => {
                const days = daysUntil(r.next_renewal_date);
                const color = renewalUrgencyColor(days);
                return (
                  <div key={r.id} className="sz-sub-list-item">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div className="sz-sub-details">
                      <div className="sz-name">{r.name}</div>
                      <div className="sz-meta">Renews in {days} day{days !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {days <= 3 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF2F2', color: '#dc2626', padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soon!</span>
                      )}
                      <div className="sz-sub-price" style={{ color: days <= 3 ? '#dc2626' : undefined }}>
                        {fmtCurrency(getMonthly(r))}
                      </div>
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
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No subscriptions yet</div>
              <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 24 }}>Add your first subscription to unlock AI insights, renewal alerts, and spending analytics.</div>
              <button className="sz-btn-primary" style={{ fontSize: 14, padding: '12px 28px' }} onClick={() => navigate('/subscriptions')}>
                Add Your First Subscription →
              </button>
            </div>
          ) : subscriptions.slice(0, 8).map((sub, idx) => {
            const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
            const bg = sub.icon_color || '#0A0A0A';
            const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
            const monthly = getMonthly(sub);
            const badgeClass = sub.usage_frequency === 'never' || sub.usage_frequency === 'rare' ? 'sz-badge-unused' : monthly > 1000 ? 'sz-badge-expensive' : 'sz-badge-ok';
            const badgeText = sub.usage_frequency === 'never' || sub.usage_frequency === 'rare' ? 'Low use' : monthly > 1000 ? 'High cost' : 'Active';
            const days = daysUntil(sub.next_renewal_date);
            return (
              <div key={sub.id} className="sz-sub-list-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="sz-sub-logo" style={{ background: isEmoji ? 'var(--sz-gray-100)' : bg }}>
                  <span style={{ fontSize: isEmoji ? 18 : 13, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
                </div>
                <div className="sz-sub-details">
                  <div className="sz-name">{sub.name}</div>
                  <div className="sz-meta">{sub.category} · {sub.billing_cycle.charAt(0).toUpperCase() + sub.billing_cycle.slice(1)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {days <= 7 && days >= 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: days <= 3 ? '#FEF2F2' : '#FFF7ED', color: days <= 3 ? '#dc2626' : '#ea580c', padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                      ⚡ {days}d
                    </span>
                  )}
                  <span className={`sz-sub-badge ${badgeClass}`}>{badgeText}</span>
                  <div className="sz-sub-price">{fmtCurrency(monthly)}</div>
                </div>
              </div>
            );
          })}
          {subscriptions.length > 8 && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--sz-gray-100)', textAlign: 'center' }}>
              <button onClick={() => navigate('/subscriptions')} style={{ background: 'none', border: 'none', color: 'var(--sz-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                View all {subscriptions.length} subscriptions →
              </button>
            </div>
          )}
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
                const isDeleting = deletingId === sub.id;
                return (
                  <div key={sub.id} className="sz-cancel-card sz-actionable-card">
                    <div className="sz-cancel-badge">Cancel Recommended</div>
                    <div className="sz-cancel-name">{sub.name}</div>
                    <div className="sz-cancel-reason">{reason}</div>
                    <div className="sz-cancel-cost">{fmtCurrency(monthly)}/mo</div>
                    <button
                      className="sz-cancel-btn"
                      onClick={() => handleMarkCancellation(sub.id, sub.name)}
                      disabled={isDeleting}
                      style={{ opacity: isDeleting ? 0.7 : 1 }}
                    >
                      {isDeleting ? 'Removing…' : 'Mark for Cancellation'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Insights teaser */}
        {insights.length > 0 && (
          <div className="sz-fade-in sz-fade-in-5" style={{ marginTop: 24, background: 'var(--sz-black)', borderRadius: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28 }}>🤖</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>You have {insights.length} AI insight{insights.length !== 1 ? 's' : ''}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Save up to {fmtCurrency(totalSavings / 12)}/mo by acting on them</div>
              </div>
            </div>
            <InteractiveHoverButton
              onClick={() => navigate('/insights')}
              className="bg-white text-black border-transparent hover:border-white/40 text-sm py-2 px-5 flex-shrink-0"
            >
              View Insights
            </InteractiveHoverButton>
          </div>
        )}
      </div>
    </div>
  );
}
