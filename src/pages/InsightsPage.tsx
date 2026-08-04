import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import type { InsightType, RichInsight } from '@/hooks/useInsights';
import { fmtCurrency } from '@/lib/format';
import { toast } from 'sonner';

const BAR_HEIGHTS = [40, 55, 48, 80, 100, 120, 140, 155];
const BAR_LABELS  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

type TagStyle = { tag: string; bg: string; color: string };

const TYPE_STYLES: Record<string, TagStyle> = {
  cancel:     { tag: 'Cancel Recommended', bg: '#FEF2F2', color: '#dc2626' },
  downgrade:  { tag: 'Downgrade',  bg: '#FFF7ED', color: '#ea580c' },
  swap:       { tag: 'Swap',       bg: '#F0F9FF', color: '#0284c7' },
  warning:    { tag: 'Warning',    bg: '#FFFBEB', color: '#d97706' },
  tip:        { tag: 'Tip',        bg: '#F0FDF4', color: '#16a34a' },
  overlap:    { tag: 'OVERLAP',    bg: '#EFF6FF', color: '#1d4ed8' },
  trial:      { tag: 'Trial Alert',  bg: '#FFFBEB', color: '#b45309' },
  price_hike: { tag: 'Price Hike',   bg: '#FFF1F2', color: '#be123c' },
};

function getTypeStyle(type: InsightType): TagStyle {
  return TYPE_STYLES[type] ?? TYPE_STYLES.tip;
}

interface CompareCardProps {
  insight: RichInsight;
  subscriptions: ReturnType<typeof useSubscriptions>['data'];
  getMonthlyFn: (s: ReturnType<typeof useSubscriptions>['data'][number]) => number;
}

function CompareCard({ insight, subscriptions, getMonthlyFn }: CompareCardProps) {
  const subs = (insight.compare_ids ?? insight.related_subscription_ids ?? [])
    .map(id => subscriptions.find(s => s.id === id))
    .filter(Boolean) as ReturnType<typeof useSubscriptions>['data'];

  if (subs.length < 2) return null;

  return (
    <div style={{ marginTop: 16, background: '#F0F9FF', borderRadius: 14, padding: 16, display: 'grid', gridTemplateColumns: `repeat(${Math.min(subs.length, 3)}, 1fr)`, gap: 12 }}>
      {subs.map(sub => {
        const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
        const bg = sub.icon_color || '#0A0A0A';
        const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
        return (
          <div key={sub.id} style={{ background: 'white', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isEmoji ? '#F0EFEC' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
              <span style={{ fontSize: isEmoji ? 18 : 13, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{sub.name}</div>
            <div style={{ fontSize: 12, color: 'var(--sz-gray-500)', marginBottom: 8 }}>{sub.category}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: '#0A0A0A' }}>{fmtCurrency(getMonthlyFn(sub))}</div>
            <div style={{ fontSize: 11, color: 'var(--sz-gray-500)' }}>/mo</div>
            <div style={{ marginTop: 8, fontSize: 11, color: sub.usage_frequency === 'daily' || sub.usage_frequency === 'weekly' ? '#16a34a' : sub.usage_frequency === 'monthly' ? '#f59e0b' : '#dc2626', fontWeight: 600 }}>
              Used {sub.usage_frequency}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const { data: subscriptions = [], activeSubs, getMonthly } = useSubscriptions();
  const { data: insights = [], dismissInsight, totalSavings, isLoading, refetch } = useInsights(subscriptions);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedLocal, setDismissedLocal] = useState<Set<string>>(new Set());
  const [dismissedCount, setDismissedCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleInsights = insights.filter(i => !dismissedLocal.has(i.id));

  const handleDismiss = async (id: string) => {
    try {
      await dismissInsight.mutateAsync(id);
      setDismissedLocal(s => new Set([...s, id]));
      setDismissedCount(c => c + 1);
      toast.success('Insight dismissed');
    } catch {
      toast.error('Failed to dismiss');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success('Analysis refreshed!');
    } catch { toast.error('Refresh failed'); }
    finally { setRefreshing(false); }
  };

  const monthlySavings = totalSavings / 12;
  const totalPossible = visibleInsights.length + dismissedCount;
  const progressPct = totalPossible > 0 ? Math.round((dismissedCount / totalPossible) * 100) : 0;

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={visibleInsights.length} />

      <div className="sz-main-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">AI Insights</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">
              {visibleInsights.length} recommendation{visibleInsights.length !== 1 ? 's' : ''} across {activeSubs.length} subscriptions
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleRefresh} disabled={refreshing}
              style={{ background: 'none', border: '1.5px solid var(--sz-gray-200)', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", color: 'var(--sz-gray-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', animation: refreshing ? 'sz-spin 0.7s linear infinite' : 'none' }}>🔄</span>
              {refreshing ? 'Refreshing…' : 'Refresh Analysis'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0A0A0A', borderRadius: 100, padding: '8px 16px' }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>AI Analysis Complete</span>
            </div>
          </div>
        </div>

        {totalPossible > 0 && (
          <div className="sz-fade-in sz-fade-in-1" style={{ background: 'white', borderRadius: 20, padding: '18px 22px', marginBottom: 18, boxShadow: 'var(--sz-card-shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Insights Resolved</div>
              <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>{dismissedCount} of {totalPossible} acted on</div>
            </div>
            <div style={{ height: 7, background: 'var(--sz-gray-200)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #E8541A, #f59e0b)', borderRadius: 100, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--sz-gray-500)', marginTop: 5 }}>{progressPct}% complete</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
          <div className="sz-insight-card sz-dark sz-fade-in sz-fade-in-1">
            <span className="sz-insight-tag sz-tag-ai">⚠ Waste Detected</span>
            <div className="sz-insight-value">{fmtCurrency(monthlySavings)}</div>
            <div className="sz-insight-text">Monthly spend that could be saved by acting on all recommendations.</div>
          </div>
          <div className="sz-insight-card sz-fade-in sz-fade-in-2">
            <span className="sz-insight-tag sz-tag-saving">✦ Annual Opportunity</span>
            <div className="sz-insight-value" style={{ color: '#0A0A0A' }}>{fmtCurrency(totalSavings)}</div>
            <div className="sz-insight-text">Total annual savings if you act on all {visibleInsights.length} recommendations.</div>
          </div>
        </div>

        <div style={{ padding: 24, background: 'white', borderRadius: 'var(--sz-radius)', boxShadow: 'var(--sz-card-shadow)', marginBottom: 20 }} className="sz-fade-in sz-fade-in-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="sz-card-title" style={{ fontSize: 16 }}>Savings Growth Forecast</div>
              <div className="sz-card-subtitle">Projected savings if you follow all recommendations</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, color: '#E8541A' }}>{fmtCurrency(totalSavings)}</div>
              <div style={{ fontSize: 11, color: 'var(--sz-gray-500)' }}>Projected annual savings</div>
            </div>
          </div>
          <div className="sz-graph-bars">
            {BAR_HEIGHTS.map((h, i) => (
              <div key={i} className="sz-g-bar-wrap">
                <div className={`sz-g-bar ${i < 4 ? 'sz-current' : 'sz-projected'}`} style={{ height: h }} />
                <div className="sz-g-bar-label">{BAR_LABELS[i]}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--sz-gray-500)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#0A0A0A' }} />Actual
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--sz-gray-500)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#E2E1DC' }} />Projected
            </div>
          </div>
        </div>

        {visibleInsights.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['trial', 'price_hike', 'overlap', 'cancel', 'downgrade', 'swap', 'tip'].map(t => {
              const s = getTypeStyle(t);
              const count = visibleInsights.filter(i => i.type === t).length;
              if (count === 0) return null;
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, background: s.bg, color: s.color, borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                  {s.tag} ({count})
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.4, marginBottom: 16 }}>AI Recommendations</div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--sz-gray-500)' }}>
              <div style={{ fontSize: 36, marginBottom: 12, animation: 'sz-spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
              <div>Analysing your subscriptions…</div>
            </div>
          ) : visibleInsights.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 24, padding: 52, textAlign: 'center', boxShadow: 'var(--sz-card-shadow)' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, marginBottom: 10 }}>All clear!</div>
              <div style={{ color: 'var(--sz-gray-500)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
                {subscriptions.length === 0
                  ? 'Add some subscriptions and we will generate personalised AI insights.'
                  : 'No active insights — your subscriptions look great! Insights regenerate as usage changes.'}
              </div>
              {subscriptions.length === 0 && (
                <button className="sz-btn-primary" onClick={() => navigate('/subscriptions')}>+ Add Subscriptions</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleInsights.map((insight, i) => {
                const ts = getTypeStyle(insight.type);
                const monthlyAmount = (insight.potential_saving ?? 0) / 12;
                const isOverlap = insight.type === 'overlap';
                const isExpanded = expandedId === insight.id;

                const isActionable = insight.type === 'cancel' || insight.type === 'trial' || insight.type === 'price_hike' || insight.type === 'overlap' || insight.type === 'downgrade';

                return (
                  <div key={insight.id} className={`sz-rec-item ${isActionable ? 'sz-actionable-card' : ''} sz-fade-in sz-fade-in-${Math.min(i + 1, 5)}`}
                    style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div className="sz-rec-icon">
                        {insight.type === 'cancel' ? '❌'
                          : insight.type === 'downgrade' ? '⬇️'
                          : insight.type === 'swap' ? '🔀'
                          : insight.type === 'overlap' ? '🔵'
                          : insight.type === 'trial' ? '⏳'
                          : insight.type === 'price_hike' ? '📈'
                          : '💡'}
                      </div>
                      <div className="sz-rec-content" style={{ flex: 1 }}>
                        <div style={{ marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: ts.bg, color: ts.color }}>{ts.tag}</span>
                        </div>
                        <div className="sz-rec-title">{insight.title}</div>
                        <div className="sz-rec-desc">{insight.description}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        {monthlyAmount > 0 && (
                          <div className="sz-rec-saving">-{fmtCurrency(monthlyAmount)}/mo</div>
                        )}
                        <div style={{ display: 'flex', gap: 5 }}>
                          {isOverlap && (
                            <button onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                              style={{ background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#1d4ed8', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                              {isExpanded ? 'Hide' : 'Compare'}
                            </button>
                          )}
                          {(insight.type === 'cancel' || insight.type === 'trial' || insight.type === 'price_hike') && (
                            <button onClick={() => navigate('/subscriptions')}
                              style={{ background: '#0A0A0A', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                              Take Action
                            </button>
                          )}
                          <button onClick={() => handleDismiss(insight.id)}
                            style={{ background: 'none', border: '1.5px solid var(--sz-gray-200)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--sz-gray-500)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                    {isOverlap && isExpanded && (
                      <CompareCard insight={insight} subscriptions={subscriptions} getMonthlyFn={getMonthly} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
