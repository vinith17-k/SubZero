import { useState } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { fmtCurrency } from '@/lib/format';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#E8541A', Productivity: '#0078D4', Music: '#1DB954',
  Design: '#F24E1E', Cloud: '#7c3aed', Health: '#16a34a',
  Education: '#f59e0b', News: '#8A8A82', Other: '#4A4A44',
  Frozen: '#93C5FD',
};

const MONTH_VARIANCE = [0.94, 0.97, 0.92, 1.02, 0.98, 1.0];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function DonutCenterLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" fontSize={12} fill="#8A8A82" fontFamily="'DM Sans', sans-serif">Monthly</tspan>
      <tspan x={cx} dy={20} fontSize={15} fontWeight={900} fill="#0A0A0A" fontFamily="'Playfair Display', serif">{fmtCurrency(total)}</tspan>
    </text>
  );
}

export default function AnalyticsPage() {
  const {
    data: allSubs = [], activeSubs, frozenSubs,
    totalMonthly, totalFrozenMonthly, getMonthly
  } = useSubscriptions();
  const { data: insights = [] } = useInsights(allSubs);

  const [simMode, setSimMode] = useState(false);
  const [simOff, setSimOff] = useState<Set<string>>(new Set());

  const toggleSimSub = (id: string) => {
    setSimOff(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const simTotal = activeSubs
    .filter(s => !simOff.has(s.id))
    .reduce((sum, s) => sum + getMonthly(s), 0);
  const simSaving = totalMonthly - simTotal;

  const byCategory = activeSubs.reduce<Record<string, number>>((acc, s) => {
    const cat = s.category || 'Other';
    acc[cat] = (acc[cat] || 0) + getMonthly(s);
    return acc;
  }, {});
  if (frozenSubs.length > 0) byCategory['Frozen'] = totalFrozenMonthly;
  const pieData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }));

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

  const topSubs = [...activeSubs]
    .sort((a, b) => getMonthly(b) - getMonthly(a))
    .slice(0, 6);

  const totalYearly = totalMonthly * 12;

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        <div style={{ marginBottom: 28 }}>
          <div className="sz-page-heading sz-fade-in sz-fade-in-1">Analytics</div>
          <div className="sz-page-sub sz-fade-in sz-fade-in-2">Spending patterns across your {allSubs.length} subscriptions</div>
        </div>

        <div className="sz-stats-grid" style={{ marginBottom: 20 }}>
          <div className="sz-stat-card sz-fade-in sz-fade-in-1">
            <div className="sz-stat-label">Monthly</div>
            <div className="sz-stat-value">{fmtCurrency(totalMonthly)}</div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>{activeSubs.length} active</div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-2">
            <div className="sz-stat-label">Yearly</div>
            <div className="sz-stat-value">{fmtCurrency(totalYearly)}</div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>Projected</div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-3">
            <div className="sz-stat-label">Avg/Service</div>
            <div className="sz-stat-value">{activeSubs.length > 0 ? fmtCurrency(totalMonthly / activeSubs.length) : '₹0'}</div>
            <div className="sz-stat-change" style={{ color: 'var(--sz-gray-500)' }}>/mo each</div>
          </div>
          <div className="sz-stat-card sz-fade-in sz-fade-in-4" style={{ background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
            <div className="sz-stat-label" style={{ color: '#1d4ed8' }}>❄️ Frozen</div>
            <div className="sz-stat-value" style={{ color: '#1d4ed8' }}>{fmtCurrency(totalFrozenMonthly)}</div>
            <div className="sz-stat-change" style={{ color: '#93c5fd' }}>{frozenSubs.length} paused</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 20 }}>
          <div className="sz-card sz-fade-in sz-fade-in-2">
            <div style={{ padding: '20px 20px 6px' }}>
              <div className="sz-card-title">Monthly Spend Trend</div>
              <div className="sz-card-subtitle">Last 6 months · dashed = projected</div>
            </div>
            <div style={{ padding: '0 16px 18px', height: 210 }}>
              {allSubs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEC" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8A8A82' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Spend']}
                      contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 10, color: 'white', fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="spend" stroke="#0A0A0A" strokeWidth={2.5} dot={{ fill: '#0A0A0A', r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="projected" stroke="#E8541A" strokeWidth={2} strokeDasharray="5 4" dot={{ fill: '#E8541A', r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sz-gray-500)', fontSize: 13 }}>Add subscriptions to see trend</div>
              )}
            </div>
          </div>

          <div className="sz-card sz-fade-in sz-fade-in-3">
            <div style={{ padding: '20px 20px 6px' }}>
              <div className="sz-card-title">By Category</div>
              <div className="sz-card-subtitle">Frozen shown as separate slice</div>
            </div>
            <div style={{ padding: '0 16px 18px', height: 210, position: 'relative' }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3} dataKey="value">
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
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sz-gray-500)', fontSize: 13 }}>No data yet</div>
              )}
              {pieData.length > 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 11, color: '#8A8A82', fontFamily: "'DM Sans', sans-serif" }}>Monthly</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0A0A0A', fontFamily: "'Playfair Display', serif" }}>{fmtCurrency(totalMonthly)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {pieData.length > 0 && (
          <div className="sz-card sz-fade-in sz-fade-in-3" style={{ padding: 20, marginBottom: 20 }}>
            <div className="sz-card-title" style={{ marginBottom: 14, fontSize: 15 }}>Category Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 20px' }}>
              {pieData.map(entry => {
                const color = CATEGORY_COLORS[entry.name] || '#8A8A82';
                const total = totalMonthly + totalFrozenMonthly;
                const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                return (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--sz-gray-700)' }}>{entry.name}{entry.name === 'Frozen' ? ' ❄️' : ''}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: `${color}22`, color }}>{pct}%</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtCurrency(entry.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* What-If Simulator */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>🧮 What-If Simulator</div>
              <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', marginTop: 2 }}>Toggle subscriptions off to see your spend change — no changes saved until you apply</div>
            </div>
            <button
              onClick={() => { setSimMode(m => !m); setSimOff(new Set()); }}
              style={{
                padding: '9px 20px', borderRadius: 100, border: 'none', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
                background: simMode ? '#E8541A' : '#0A0A0A', color: 'white',
              }}
            >
              {simMode ? '✕ Exit Simulator' : '🧮 Open Simulator'}
            </button>
          </div>

          {simMode && (
            <div className="sz-card" style={{ overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(90deg, #FFF7ED, #FFFBEB)', borderBottom: '2px solid #F59E0B', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>SIMULATION MODE — changes are not saved</span>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: '#0A0A0A' }}>{fmtCurrency(simTotal)}</div>
                    <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>Simulated/mo</div>
                  </div>
                  {simSaving > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: '#16a34a' }}>-{fmtCurrency(simSaving)}/mo</div>
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>You'd save ({fmtCurrency(simSaving * 12)}/yr)</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '4px 0' }}>
                {activeSubs.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--sz-gray-500)', fontSize: 14 }}>No active subscriptions to simulate</div>
                ) : activeSubs.map(sub => {
                  const isOff = simOff.has(sub.id);
                  const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
                  const bg = sub.icon_color || '#0A0A0A';
                  const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
                  const m = getMonthly(sub);
                  return (
                    <label key={sub.id} htmlFor={`sim-${sub.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', opacity: isOff ? 0.4 : 1, transition: 'all 0.3s', borderBottom: '1px solid var(--sz-gray-100)', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget).style.background = 'var(--sz-gray-50)'; }}
                      onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
                    >
                      <input type="checkbox" checked={!isOff} onChange={() => toggleSimSub(sub.id)} id={`sim-${sub.id}`}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E8541A', flexShrink: 0 }} />
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: isEmoji ? 'var(--sz-gray-100)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: isEmoji ? 15 : 11, color: isEmoji ? undefined : 'white', fontWeight: 700 }}>{icon}</span>
                      </div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textDecoration: isOff ? 'line-through' : 'none', color: isOff ? 'var(--sz-gray-400)' : '#0A0A0A' }}>{sub.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--sz-gray-500)', marginRight: 8 }}>{sub.category}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isOff ? 'var(--sz-gray-400)' : '#0A0A0A', minWidth: 60, textAlign: 'right', textDecoration: isOff ? 'line-through' : 'none' }}>{fmtCurrency(m)}/mo</span>
                    </label>
                  );
                })}
              </div>

              {simOff.size > 0 && (
                <div style={{ padding: '14px 20px', background: '#F0FDF4', borderTop: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, color: '#14532D', fontWeight: 600 }}>
                    Save {fmtCurrency(simSaving)}/mo · {fmtCurrency(simSaving * 12)}/yr by cancelling {simOff.size} sub{simOff.size !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSimOff(new Set())}
                      style={{ background: 'none', border: '1.5px solid var(--sz-gray-200)', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Reset</button>
                    <button onClick={() => { window.location.href = '/subscriptions'; }}
                      style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Apply Changes</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <div className="sz-card-title" style={{ fontSize: 16, marginBottom: 12 }}>Top Subscriptions by Cost</div>
        </div>
        {topSubs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--sz-gray-500)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div>Add subscriptions to see analytics</div>
          </div>
        ) : (
          <div className="sz-card sz-fade-in sz-fade-in-5">
            {topSubs.map((sub, i) => {
              const m = getMonthly(sub);
              const pct = totalMonthly > 0 ? (m / totalMonthly) * 100 : 0;
              const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
              const bg = sub.icon_color || '#0A0A0A';
              const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
              const barColor = CATEGORY_COLORS[sub.category] || '#0A0A0A';
              return (
                <div key={sub.id} className="sz-sub-list-item">
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: '#F0EFEC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#8A8A82', flexShrink: 0 }}>{i + 1}</div>
                  <div className="sz-sub-logo" style={{ background: isEmoji ? 'var(--sz-gray-100)' : bg, width: 30, height: 30 }}>
                    <span style={{ fontSize: isEmoji ? 13 : 10, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
                  </div>
                  <div className="sz-sub-details">
                    <div className="sz-name">{sub.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <div style={{ flex: 1, height: 4, background: '#F0EFEC', borderRadius: 100, overflow: 'hidden', maxWidth: 200 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 100, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--sz-gray-500)', flexShrink: 0 }}>{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtCurrency(m)}<span style={{ fontSize: 10, color: 'var(--sz-gray-500)', fontWeight: 400, marginLeft: 2 }}>/mo</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
