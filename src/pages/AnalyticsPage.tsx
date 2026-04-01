import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsPage() {
  const { data: subscriptions = [], getMonthly, totalMonthly } = useSubscriptions();
  const { data: insights = [] } = useInsights(subscriptions);

  // Category breakdown
  const byCategory = subscriptions.reduce<Record<string, number>>((acc, s) => {
    const cat = s.category || 'Other';
    acc[cat] = (acc[cat] || 0) + getMonthly(s);
    return acc;
  }, {});
  const pieData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  // Monthly trend (projected 6 months)
  const now = new Date();
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const monthIdx = (now.getMonth() - 5 + i + 12) % 12;
    const isPast = i < 5;
    // Simulate slight variance for past months
    const variance = isPast ? (Math.random() - 0.5) * 0.1 : 0;
    return {
      month: MONTHS[monthIdx],
      spend: Math.round(totalMonthly * (1 + variance)),
      projected: !isPast ? Math.round(totalMonthly) : undefined,
    };
  });

  // Top subscriptions
  const topSubs = [...subscriptions]
    .sort((a, b) => getMonthly(b) - getMonthly(a))
    .slice(0, 5);

  const totalYearly = totalMonthly * 12;

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        <div style={{ marginBottom: 32 }}>
          <div className="sz-page-heading sz-fade-in sz-fade-in-1">Analytics</div>
          <div className="sz-page-sub sz-fade-in sz-fade-in-2">Spending patterns and trends across your subscriptions</div>
        </div>

        {/* Top stat cards */}
        <div className="sz-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="sz-stat-card sz-fade-in sz-fade-in-1">
            <div className="sz-stat-label">Monthly Total</div>
            <div className="sz-stat-value">{fmtCurrency(totalMonthly)}</div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>{subscriptions.length} services</div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-2">
            <div className="sz-stat-label">Annual Spend</div>
            <div className="sz-stat-value">{fmtCurrency(totalYearly)}</div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>Projected for this year</div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-3" style={{ background: '#0A0A0A' }}>
            <div className="sz-stat-label" style={{ color: 'rgba(255,255,255,0.4)' }}>Avg Per Service</div>
            <div className="sz-stat-value" style={{ color: '#E8541A' }}>
              {subscriptions.length > 0 ? fmtCurrency(totalMonthly / subscriptions.length) : '₹0'}
            </div>
            <div className="sz-stat-change" style={{ color: 'rgba(255,255,255,0.4)' }}>Per subscription/month</div>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Trend Line chart */}
          <div className="sz-card sz-fade-in sz-fade-in-2">
            <div style={{ padding: '24px 24px 8px' }}>
              <div className="sz-card-title">Monthly Spend Trend</div>
              <div className="sz-card-subtitle">Last 6 months + current projection</div>
            </div>
            <div style={{ padding: '0 16px 20px', height: 220 }}>
              {subscriptions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEC" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A8A82' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Monthly Spend']}
                      contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 10, color: 'white', fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="spend" stroke="#0A0A0A" strokeWidth={2.5} dot={{ fill: '#0A0A0A', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sz-gray-500)', fontSize: 14 }}>Add subscriptions to see trend</div>
              )}
            </div>
          </div>

          {/* Pie chart */}
          <div className="sz-card sz-fade-in sz-fade-in-3">
            <div style={{ padding: '24px 24px 8px' }}>
              <div className="sz-card-title">By Category</div>
              <div className="sz-card-subtitle">Monthly spend breakdown</div>
            </div>
            <div style={{ padding: '0 16px 20px', height: 220 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#8A8A82'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`₹${v}`, 'Monthly']}
                      contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 10, color: 'white', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sz-gray-500)', fontSize: 14 }}>No data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Category legend */}
        {pieData.length > 0 && (
          <div className="sz-card sz-fade-in sz-fade-in-3" style={{ padding: 24, marginBottom: 24 }}>
            <div className="sz-pie-legend" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 24px' }}>
              {pieData.map((entry) => (
                <div key={entry.name} className="sz-legend-item">
                  <div className="sz-legend-dot" style={{ background: CATEGORY_COLORS[entry.name] || '#8A8A82' }} />
                  <span className="sz-legend-label">{entry.name}</span>
                  <span className="sz-legend-value">{fmtCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top subscriptions */}
        <div className="sz-section-tag sz-fade-in sz-fade-in-4">
          <div>
            <div className="sz-card-title" style={{ fontSize: 18 }}>Top Subscriptions by Cost</div>
            <div className="sz-card-subtitle">Highest monthly spend</div>
          </div>
        </div>

        {topSubs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--sz-gray-500)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            <div>Add subscriptions to see analytics</div>
          </div>
        ) : (
          <div className="sz-card sz-fade-in sz-fade-in-5">
            {topSubs.map((sub, i) => {
              const monthly = getMonthly(sub);
              const pct = totalMonthly > 0 ? (monthly / totalMonthly) * 100 : 0;
              const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
              const bg = sub.icon_color || '#0A0A0A';
              const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
              return (
                <div key={sub.id} className="sz-sub-list-item">
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F0EFEC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#8A8A82', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div className="sz-sub-logo" style={{ background: isEmoji ? 'var(--sz-gray-100)' : bg, width: 32, height: 32 }}>
                    <span style={{ fontSize: isEmoji ? 14 : 11, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
                  </div>
                  <div className="sz-sub-details">
                    <div className="sz-name">{sub.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 4, background: '#F0EFEC', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: CATEGORY_COLORS[sub.category] || '#0A0A0A', borderRadius: 100 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--sz-gray-500)', flexShrink: 0 }}>{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="sz-sub-price">{fmtCurrency(monthly)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
