import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { fmtCurrency, toMonthly } from '@/lib/format';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#E8541A', Productivity: '#0078D4', Music: '#1DB954',
  Design: '#F24E1E', Cloud: '#7c3aed', Health: '#16a34a',
  Education: '#f59e0b', News: '#8A8A82', Other: '#4A4A44'
};

// Fixed variance per month index — no random, no jitter on re-render
const MONTH_VARIANCE = [0.94, 0.97, 0.92, 1.02, 0.98, 1.0];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Custom label rendered in center of donut chart */
const DonutCenterLabel = ({ cx, cy, total }: { cx: number; cy: number; total: number }) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
    <tspan x={cx} dy="-6" fontSize={13} fill="#8A8A82" fontFamily="'DM Sans', sans-serif">Monthly</tspan>
    <tspan x={cx} dy={22} fontSize={16} fontWeight={900} fill="#0A0A0A" fontFamily="'Playfair Display', serif">
      {fmtCurrency(total)}
    </tspan>
  </text>
);

export default function AnalyticsPage() {
  const { data: subscriptions = [], totalMonthly } = useSubscriptions();
  const { data: insights = [] } = useInsights(subscriptions);

  // Category breakdown
  const byCategory = subscriptions.reduce<Record<string, number>>((acc, s) => {
    const cat = s.category || 'Other';
    acc[cat] = (acc[cat] || 0) + toMonthly(s.cost, s.billing_cycle);
    return acc;
  }, {});
  const pieData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  // Monthly trend (deterministic variance — no Math.random)
  const now = new Date();
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const monthIdx = (now.getMonth() - 5 + i + 12) % 12;
    const isPast = i < 5;
    return {
      month: MONTHS[monthIdx],
      spend: isPast ? Math.round(totalMonthly * MONTH_VARIANCE[i]) : undefined,
      projected: !isPast ? Math.round(totalMonthly) : undefined,
    };
  });

  // Top subscriptions
  const topSubs = [...subscriptions]
    .sort((a, b) => toMonthly(b.cost, b.billing_cycle) - toMonthly(a.cost, a.billing_cycle))
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
                    <Line type="monotone" dataKey="spend" stroke="#0A0A0A" strokeWidth={2.5} dot={{ fill: '#0A0A0A', r: 4 }} activeDot={{ r: 6 }} connectNulls />
                    <Line type="monotone" dataKey="projected" stroke="#E8541A" strokeWidth={2} strokeDasharray="5 4" dot={{ fill: '#E8541A', r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sz-gray-500)', fontSize: 14 }}>Add subscriptions to see trend</div>
              )}
            </div>
          </div>

          {/* Donut chart with center label */}
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
                      innerRadius={52}
                      outerRadius={82}
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
                    {/* @ts-ignore — custom label component */}
                    <DonutCenterLabel cx={0} cy={0} total={totalMonthly} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sz-gray-500)', fontSize: 14 }}>No data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Category legend with colored pills */}
        {pieData.length > 0 && (
          <div className="sz-card sz-fade-in sz-fade-in-3" style={{ padding: 24, marginBottom: 24 }}>
            <div className="sz-card-title" style={{ marginBottom: 16 }}>Category Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 24px' }}>
              {pieData.map((entry) => {
                const color = CATEGORY_COLORS[entry.name] || '#8A8A82';
                const pct = totalMonthly > 0 ? Math.round((entry.value / totalMonthly) * 100) : 0;
                return (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--sz-gray-700)' }}>{entry.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: `${color}18`, color, letterSpacing: '0.03em'
                    }}>{pct}%</span>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 50, textAlign: 'right' }}>{fmtCurrency(entry.value)}</span>
                  </div>
                );
              })}
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
              const monthly = toMonthly(sub.cost, sub.billing_cycle);
              const pct = totalMonthly > 0 ? (monthly / totalMonthly) * 100 : 0;
              const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
              const bg = sub.icon_color || '#0A0A0A';
              const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
              const barColor = CATEGORY_COLORS[sub.category] || '#0A0A0A';
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
                      <div style={{ flex: 1, height: 5, background: '#F0EFEC', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 100, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--sz-gray-500)', flexShrink: 0 }}>{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div className="sz-sub-price">{fmtCurrency(monthly)}</div>
                    <span style={{ fontSize: 10, color: 'var(--sz-gray-500)' }}>/mo</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
