import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { toast } from 'sonner';

const TYPE_STYLE: Record<string, { tag: string; className: string }> = {
  cancel:    { tag: '❌ Cancel',    className: 'sz-tag-cancel' },
  downgrade: { tag: '⬇️ Downgrade', className: 'sz-tag-downgrade' },
  swap:      { tag: '🔀 Swap',      className: 'sz-tag-swap' },
  warning:   { tag: '⚠️ Warning',  className: 'sz-tag-warning' },
  tip:       { tag: '💡 Tip',       className: 'sz-tag-tip' },
};

const BAR_HEIGHTS = [40, 55, 48, 80, 100, 120, 140, 155];
const BAR_LABELS  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

export default function InsightsPage() {
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: insights = [], dismissInsight, totalSavings, isLoading } = useInsights(subscriptions);

  const handleDismiss = async (id: string) => {
    try {
      await dismissInsight.mutateAsync(id);
      toast.success('Insight dismissed');
    } catch {
      toast.error('Failed to dismiss');
    }
  };

  const monthlySavings = totalSavings / 12;

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">AI Insights</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">
              {insights.length} recommendation{insights.length !== 1 ? 's' : ''} based on your usage patterns
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0A0A0A', borderRadius: 100, padding: '8px 16px' }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>AI Analysis Complete</span>
          </div>
        </div>

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="sz-insight-card sz-dark sz-fade-in sz-fade-in-1">
            <span className="sz-insight-tag sz-tag-ai">⚠ Waste Detected</span>
            <div className="sz-insight-value">₹{Math.round(monthlySavings).toLocaleString('en-IN')}</div>
            <div className="sz-insight-text">Monthly spend that could be saved by acting on AI recommendations.</div>
          </div>
          <div className="sz-insight-card sz-fade-in sz-fade-in-2">
            <span className="sz-insight-tag sz-tag-saving">✦ Opportunity</span>
            <div className="sz-insight-value" style={{ color: '#0A0A0A' }}>₹{Math.round(totalSavings).toLocaleString('en-IN')}</div>
            <div className="sz-insight-text">Total annual savings potential if you act on all {insights.length} recommendations.</div>
          </div>
        </div>

        {/* Savings Graph */}
        <div style={{ padding: 28, background: 'white', borderRadius: 'var(--sz-radius)', boxShadow: 'var(--sz-card-shadow)', marginBottom: 20 }} className="sz-fade-in sz-fade-in-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="sz-card-title" style={{ fontSize: 18 }}>Savings Growth Forecast</div>
              <div className="sz-card-subtitle">Projected savings if you follow AI recommendations</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: '#E8541A' }}>
                ₹{Math.round(totalSavings).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>Projected annual savings</div>
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
          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--sz-gray-500)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#0A0A0A' }} />Actual
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--sz-gray-500)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#E2E1DC' }} />Projected
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, marginBottom: 20 }}>AI Recommendations</div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--sz-gray-500)' }}>Analysing your subscriptions…</div>
          ) : insights.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: 'var(--sz-card-shadow)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>All clear!</div>
              <div style={{ color: 'var(--sz-gray-500)', fontSize: 14 }}>No active insights — your subscriptions look great. Add more subscriptions to get AI analysis.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insights.map((insight, i) => {
                const typeInfo = TYPE_STYLE[insight.type] || TYPE_STYLE.tip;
                const monthlyAmount = (insight.potential_saving ?? 0) / 12;
                return (
                  <div key={insight.id} className={`sz-rec-item sz-fade-in sz-fade-in-${Math.min(i + 1, 5)}`}>
                    <div className="sz-rec-icon">
                      {insight.type === 'cancel' ? '❌' : insight.type === 'downgrade' ? '⬇️' : insight.type === 'swap' ? '🔀' : insight.type === 'warning' ? '⚠️' : '💡'}
                    </div>
                    <div className="sz-rec-content">
                      <div style={{ marginBottom: 6 }}>
                        <span className={`sz-insight-tag ${typeInfo.className}`} style={{ marginBottom: 0 }}>{typeInfo.tag}</span>
                      </div>
                      <div className="sz-rec-title">{insight.title}</div>
                      <div className="sz-rec-desc">{insight.description}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      {monthlyAmount > 0 && (
                        <div className="sz-rec-saving">-₹{Math.round(monthlyAmount).toLocaleString('en-IN')}/mo</div>
                      )}
                      <button
                        onClick={() => handleDismiss(insight.id)}
                        style={{ background: 'none', border: '1.5px solid var(--sz-gray-200)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: 'var(--sz-gray-500)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { (e.currentTarget).style.background = 'var(--sz-gray-100)'; }}
                        onMouseLeave={e => { (e.currentTarget).style.background = 'none'; }}
                      >
                        Dismiss
                      </button>
                    </div>
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
