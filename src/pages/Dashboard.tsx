import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { fmtCurrency, daysUntil, renewalUrgencyColor } from '@/lib/format';
import { isTrial, parseMeta, VAULT_PRESETS } from '@/lib/subscriptionMeta';
import { NumberTicker } from '@/components/ui/number-ticker';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#E8541A', Productivity: '#0078D4', Music: '#1DB954',
  Design: '#F24E1E', Cloud: '#7c3aed', Health: '#16a34a',
  Education: '#f59e0b', News: '#8A8A82', Other: '#4A4A44'
};

const USAGE_ESTIMATES: Record<string, { label: string; usesPerMonth: number; badgeColor: string; badgeBg: string; text: string }> = {
  never: { label: '0 uses', usesPerMonth: 0, badgeColor: '#DC2626', badgeBg: '#FEE2E2', text: 'Zero usage · Pure waste' },
  rare: { label: '~2 uses/mo', usesPerMonth: 2, badgeColor: '#D97706', badgeBg: '#FEF3C7', text: 'Low value' },
  monthly: { label: '~4 uses/mo', usesPerMonth: 4, badgeColor: '#2563EB', badgeBg: '#DBEAFE', text: 'Moderate' },
  weekly: { label: '~12 uses/mo', usesPerMonth: 12, badgeColor: '#16A34A', badgeBg: '#DCFCE7', text: 'High value' },
  daily: { label: '~30 uses/mo', usesPerMonth: 30, badgeColor: '#16A34A', badgeBg: '#DCFCE7', text: 'Essential' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    data: allSubs = [], activeSubs, frozenSubs, urgentTrials,
    getMonthly, totalMonthly, deleteSubscription, freezeSubscription, isLoading
  } = useSubscriptions();
  const { data: insights = [], totalSavings } = useInsights(allSubs);
  
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionSubId, setActionSubId] = useState<string | null>(null);

  const name = (user?.user_metadata?.full_name as string) || user?.email || 'there';
  const firstName = name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const now = new Date();
  const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Upcoming renewals (next 30 days) — exclude frozen
  const upcoming = useMemo(() => {
    return [...activeSubs]
      .filter(s => s.next_renewal_date && daysUntil(s.next_renewal_date) <= 30 && daysUntil(s.next_renewal_date) >= 0)
      .sort((a, b) => daysUntil(a.next_renewal_date) - daysUntil(b.next_renewal_date))
      .slice(0, 5);
  }, [activeSubs]);

  // Next renewal within 3 days for urgent banner
  const dueVerySoon = useMemo(() => {
    return upcoming.filter(s => daysUntil(s.next_renewal_date) <= 3);
  }, [upcoming]);

  // Waste spend: never or rare usage
  const wasteSubs = useMemo(() => {
    return activeSubs.filter(s => s.usage_frequency === 'never' || s.usage_frequency === 'rare');
  }, [activeSubs]);

  const wasteSpendMonthly = useMemo(() => {
    return wasteSubs.reduce((acc, s) => acc + getMonthly(s), 0);
  }, [wasteSubs, getMonthly]);

  // Sort by worst value: least frequently used + highest cost first
  const worstValueSubs = useMemo(() => {
    const usageRank: Record<string, number> = { never: 0, rare: 1, monthly: 2, weekly: 3, daily: 4 };
    return [...activeSubs].sort((a, b) => {
      const rankA = usageRank[a.usage_frequency || 'monthly'] ?? 2;
      const rankB = usageRank[b.usage_frequency || 'monthly'] ?? 2;
      if (rankA !== rankB) return rankA - rankB;
      return getMonthly(b) - getMonthly(a);
    });
  }, [activeSubs, getMonthly]);

  // Category breakdown for chart
  const chartData = useMemo(() => {
    const byCategory = activeSubs.reduce<Record<string, number>>((acc, s) => {
      const cat = s.category || 'Other';
      acc[cat] = (acc[cat] || 0) + getMonthly(s);
      return acc;
    }, {});
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [activeSubs, getMonthly]);

  const handleQuickCancel = async (id: string, subName: string) => {
    try {
      setDeletingId(id);
      await deleteSubscription.mutateAsync(id);
      toast.success(`${subName} cancelled`);
    } catch {
      toast.error('Could not cancel subscription');
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickFreeze = async (id: string, notes: string | null, subName: string) => {
    try {
      await freezeSubscription.mutateAsync({ id, currentNotes: notes });
      toast.success(`${subName} paused (frozen)`);
    } catch {
      toast.error('Could not pause subscription');
    }
  };

  const multiplier = timeframe === 'yearly' ? 12 : 1;
  const periodLabel = timeframe === 'yearly' ? '/yr' : '/mo';

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">{greeting}, {firstName}</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">Track what you pay vs what you actually use · {monthYear}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Monthly / Yearly Toggle */}
            <div style={{ display: 'flex', background: 'var(--sz-gray-100)', borderRadius: 100, padding: 3, border: '1px solid var(--sz-gray-200)' }}>
              <button
                type="button"
                onClick={() => setTimeframe('monthly')}
                style={{
                  border: 'none', background: timeframe === 'monthly' ? '#0A0A0A' : 'transparent',
                  color: timeframe === 'monthly' ? 'white' : 'var(--sz-gray-600)',
                  fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s'
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('yearly')}
                style={{
                  border: 'none', background: timeframe === 'yearly' ? '#0A0A0A' : 'transparent',
                  color: timeframe === 'yearly' ? 'white' : 'var(--sz-gray-600)',
                  fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s'
                }}
              >
                Yearly
              </button>
            </div>

            <div className="sz-avatar sz-fade-in sz-fade-in-1" onClick={() => navigate('/settings')}>
              {firstName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* 3-day renewal warning strip */}
        {dueVerySoon.length > 0 && (
          <div style={{ background: '#FFF1F2', border: '1.5px solid #F43F5E', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }} className="sz-fade-in sz-fade-in-1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E11D48', display: 'inline-block' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#9F1239' }}>
                  UPI AutoPay Renewal Alert: {dueVerySoon.map(s => s.name).join(', ')} renews in ≤3 days
                </div>
                <div style={{ fontSize: 12, color: '#BE123C' }}>
                  Total {fmtCurrency(dueVerySoon.reduce((acc, s) => acc + s.cost, 0))} will be deducted soon unless paused or cancelled.
                </div>
              </div>
            </div>
            <button className="sz-btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => navigate('/subscriptions')}>
              Review Subscriptions
            </button>
          </div>
        )}

        {/* Trial urgency banner */}
        {urgentTrials.length > 0 && (
          <div style={{ background: '#FFF7ED', border: '1.5px solid #F59E0B', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }} className="sz-fade-in sz-fade-in-1">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Free Trial Ending Soon</div>
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                {urgentTrials.map(s => s.name).join(', ')} will start billing within 3 days. Cancel now to avoid being charged.
              </div>
            </div>
            <button className="sz-btn-primary" style={{ fontSize: 12, padding: '7px 16px', background: '#92400E' }} onClick={() => navigate('/insights')}>
              Manage Trials
            </button>
          </div>
        )}

        {/* HERO: Pay vs Use High-Impact Callout */}
        <div style={{
          background: 'linear-gradient(135deg, #1C1917 0%, #0C0A09 100%)',
          color: 'white',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 28,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }} className="sz-fade-in sz-fade-in-1">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F97316', marginBottom: 6 }}>
              Pay vs. Use Diagnosis
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, lineHeight: 1.2, marginBottom: 8 }}>
              {wasteSpendMonthly > 0 ? (
                <>
                  <span>{fmtCurrency(wasteSpendMonthly * multiplier)}</span>
                  <span style={{ fontSize: 20, fontWeight: 400, opacity: 0.8 }}>{periodLabel}</span> going to underused services
                </>
              ) : (
                'Zero wasted subscriptions detected!'
              )}
            </div>
            <div style={{ fontSize: 14, color: '#A8A29E', maxWidth: 520, lineHeight: 1.5 }}>
              {wasteSubs.length > 0 ? (
                `You have ${wasteSubs.length} subscription${wasteSubs.length > 1 ? 's' : ''} with zero or rare activity. Cancelling or pausing them recovers ${fmtCurrency(wasteSpendMonthly * 12)} every year.`
              ) : (
                'All your active subscriptions are being utilized regularly. Great job maintaining financial discipline.'
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {wasteSubs.length > 0 && (
              <button
                className="sz-btn-primary"
                style={{ background: '#EA580C', color: 'white', padding: '12px 22px', fontSize: 14 }}
                onClick={() => {
                  const el = document.getElementById('worst-value-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Review {wasteSubs.length} Idle Subs
              </button>
            )}
            <button
              className="sz-btn-secondary"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 20px', fontSize: 14 }}
              onClick={() => navigate('/insights')}
            >
              View Insights ({insights.length})
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="sz-stats-grid">
          {isLoading ? (
            <>
              <div className="sz-stat-card"><Skeleton className="h-20 w-full" /></div>
              <div className="sz-stat-card"><Skeleton className="h-20 w-full" /></div>
              <div className="sz-stat-card"><Skeleton className="h-20 w-full" /></div>
            </>
          ) : (
            <>
              <div className="sz-stat-card sz-fade-in sz-fade-in-1">
                <div className="sz-stat-label">Total Spend ({timeframe === 'yearly' ? 'Yearly' : 'Monthly'})</div>
                <div className="sz-stat-value" style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span>₹</span>
                  <NumberTicker value={Math.round(totalMonthly * multiplier)} />
                </div>
                <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>
                  {activeSubs.length} active subscription{activeSubs.length !== 1 ? 's' : ''} tracked
                </div>
              </div>

              <div className="sz-stat-card sz-fade-in sz-fade-in-2">
                <div className="sz-stat-label">Idle / Waste Spend</div>
                <div className="sz-stat-value" style={{ display: 'flex', alignItems: 'baseline', color: wasteSpendMonthly > 0 ? '#DC2626' : '#16A34A' }}>
                  <span>₹</span>
                  <NumberTicker value={Math.round(wasteSpendMonthly * multiplier)} />
                </div>
                <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>
                  {totalMonthly > 0 ? `${Math.round((wasteSpendMonthly / totalMonthly) * 100)}% of total budget` : '0% waste'}
                </div>
              </div>

              <div className="sz-stat-card sz-glass-card sz-fade-in sz-fade-in-3">
                <div className="sz-stat-label" style={{ color: '#0369A1', fontWeight: 700 }}>Total Savings Potential</div>
                <div className="sz-stat-value" style={{ color: 'var(--sz-accent)', fontSize: 44, marginTop: 4, display: 'flex', alignItems: 'baseline' }}>
                  <span>₹</span>
                  <NumberTicker value={Math.round((totalSavings / 12) * multiplier)} />
                </div>
                <div className="sz-stat-change" style={{ color: '#0284C7', fontWeight: 600, marginTop: 10 }}>
                  {insights.length} actionable opportunity{insights.length !== 1 ? 's' : ''} waiting
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dashboard grid: Chart + Renewals */}
        <div className="sz-dashboard-grid">
          {/* Spending Breakdown chart */}
          <div className="sz-card sz-fade-in sz-fade-in-2">
            <div style={{ padding: '24px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sz-card-title">Category Distribution</div>
                <div className="sz-card-subtitle">{timeframe === 'yearly' ? 'Annualized' : 'Monthly'} breakdown by category</div>
              </div>
            </div>
            {chartData.length > 0 ? (
              <div style={{ padding: '0 16px 20px', height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 22, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A8A82' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [`₹${v * multiplier}`, timeframe === 'yearly' ? 'Yearly' : 'Monthly']}
                      contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 10, color: 'white', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#4A4A44' }} formatter={(v: number) => `₹${v * multiplier}`} />
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#E8541A'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="sz-frost-empty-state" style={{ margin: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: 'var(--sz-black)' }}>No spend data yet</div>
                <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', marginBottom: 16 }}>Add subscriptions to unlock category insights.</div>
                <button className="sz-btn-primary" style={{ fontSize: 13, padding: '9px 18px' }} onClick={() => navigate('/subscriptions')}>+ Add Subscription</button>
              </div>
            )}
          </div>

          {/* Next Renewals timeline */}
          <div className="sz-card sz-fade-in sz-fade-in-3" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 0' }}>
              <div className="sz-card-title">Renewal Timeline</div>
              <div className="sz-card-subtitle">Charges coming in the next 30 days</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {upcoming.length === 0 ? (
                <div style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--sz-gray-500)', fontSize: 14 }}>
                  <div style={{ fontSize: 24, marginBottom: 8, color: 'var(--sz-gray-400)' }}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <div>No upcoming renewals in 30 days</div>
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
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF2F2', color: '#dc2626', padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due soon</span>
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

        {/* All Subscriptions — Sorted by Worst Value First */}
        <div id="worst-value-section" className="sz-section-tag sz-fade-in sz-fade-in-3" style={{ marginTop: 12 }}>
          <div>
            <div className="sz-card-title" style={{ fontSize: 20, letterSpacing: -0.5 }}>Subscription Value Audit</div>
            <div className="sz-card-subtitle">Prioritized by lowest value and highest waste risk</div>
          </div>
          <button className="sz-btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} onClick={() => navigate('/subscriptions')}>
            + Add Subscription
          </button>
        </div>

        <div className="sz-card sz-fade-in sz-fade-in-4" style={{ marginBottom: 28 }}>
          {worstValueSubs.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ marginBottom: 16, color: 'var(--sz-gray-300)' }}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No subscriptions yet</div>
              <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 24 }}>Add your subscriptions to detect waste and calculate true cost per use.</div>
              <button className="sz-btn-primary" style={{ fontSize: 14, padding: '12px 28px' }} onClick={() => navigate('/subscriptions')}>
                Add First Subscription
              </button>
            </div>
          ) : worstValueSubs.map((sub, idx) => {
            const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
            const bg = sub.icon_color || '#0A0A0A';
            const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
            const monthly = getMonthly(sub);
            const freq = sub.usage_frequency || 'monthly';
            const usageMeta = USAGE_ESTIMATES[freq] ?? USAGE_ESTIMATES.monthly;
            const costPerUse = usageMeta.usesPerMonth > 0 ? Math.round(monthly / usageMeta.usesPerMonth) : null;
            const meta = parseMeta(sub.notes);
            const preset = VAULT_PRESETS[sub.name];
            const cancelUrl = meta.cancel_url || preset?.cancel_url;
            const days = daysUntil(sub.next_renewal_date);
            const isActionExpanded = actionSubId === sub.id;

            return (
              <div key={sub.id} style={{ borderBottom: idx === worstValueSubs.length - 1 ? 'none' : '1px solid var(--sz-gray-100)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
                    <div className="sz-sub-logo" style={{ background: isEmoji ? 'var(--sz-gray-100)' : bg, flexShrink: 0 }}>
                      <span style={{ fontSize: isEmoji ? 18 : 13, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sz-black)' }}>{sub.name}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: usageMeta.badgeColor,
                          background: usageMeta.badgeBg, padding: '2px 8px', borderRadius: 100
                        }}>
                          {usageMeta.text}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--sz-gray-500)', marginTop: 2 }}>
                        {sub.category} · Renews in {days}d
                      </div>
                    </div>
                  </div>

                  {/* Usage to cost metric */}
                  <div style={{ textAlign: 'right', minWidth: 140 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--sz-black)' }}>
                      {fmtCurrency(monthly * multiplier)}{periodLabel}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--sz-gray-500)', marginTop: 2 }}>
                      {costPerUse ? `~₹${costPerUse} per use` : '₹0 return · Unused'}
                    </div>
                  </div>

                  {/* Action triggers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setActionSubId(isActionExpanded ? null : sub.id)}
                      style={{
                        background: 'var(--sz-gray-100)', border: '1px solid var(--sz-gray-200)',
                        borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
                      }}
                    >
                      {isActionExpanded ? 'Close' : 'Actions'}
                    </button>
                  </div>
                </div>

                {/* Inline Action Bar */}
                {isActionExpanded && (
                  <div style={{
                    marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--sz-gray-200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                    background: '#FAFAF9', padding: '12px 14px', borderRadius: 10
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--sz-gray-600)' }}>
                      Cancelling this subscription saves <strong>{fmtCurrency(monthly * 12)}/year</strong>.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {cancelUrl && (
                        <a
                          href={cancelUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#FEE2E2', color: '#DC2626', textDecoration: 'none',
                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4
                          }}
                        >
                          Direct Cancel Link ↗
                        </a>
                      )}
                      <button
                        onClick={() => handleQuickFreeze(sub.id, sub.notes, sub.name)}
                        style={{
                          background: 'white', border: '1px solid var(--sz-gray-300)',
                          color: '#2563EB', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Pause (Freeze)
                      </button>
                      <button
                        onClick={() => handleQuickCancel(sub.id, sub.name)}
                        disabled={deletingId === sub.id}
                        style={{
                          background: '#DC2626', color: 'white', border: 'none',
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {deletingId === sub.id ? 'Removing…' : 'Mark as Cancelled'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Insights teaser */}
        {insights.length > 0 && (
          <div className="sz-fade-in sz-fade-in-5" style={{ marginTop: 24, background: 'var(--sz-black)', borderRadius: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>You have {insights.length} subscription insights</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Save up to {fmtCurrency((totalSavings / 12) * multiplier)}{periodLabel} by optimizing duplicate & unused plans</div>
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
