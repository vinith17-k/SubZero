import { useState } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Category = Database['public']['Enums']['subscription_category'];
type BillingCycle = Database['public']['Enums']['billing_cycle'];
type UsageFrequency = Database['public']['Enums']['usage_frequency'];

const CATEGORIES: Category[] = ['Entertainment', 'Productivity', 'Music', 'Design', 'Cloud', 'Health', 'Education', 'News', 'Other'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly'];
const USAGE_FREQS: UsageFrequency[] = ['daily', 'weekly', 'monthly', 'rare', 'never'];
const COLOR_PRESETS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB347', '#E50914', '#1DB954', '#FF0000', '#0078D4'];

function fmtCurrency(n: number) {
  if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
  return `₹${Math.round(n)}`;
}

interface AddModalProps {
  onClose: () => void;
  editData?: ReturnType<typeof useSubscriptions>['data'] extends (infer T)[] ? T : never;
}

function AddSubscriptionModal({ onClose, editData }: AddModalProps) {
  const { addSubscription, updateSubscription } = useSubscriptions();
  const [form, setForm] = useState({
    name: editData?.name ?? '',
    cost: editData?.cost?.toString() ?? '',
    billing_cycle: (editData?.billing_cycle ?? 'monthly') as BillingCycle,
    next_renewal_date: editData?.next_renewal_date ?? '',
    icon_emoji: editData?.icon_emoji ?? '',
    icon_color: editData?.icon_color ?? '#0A0A0A',
    usage_frequency: (editData?.usage_frequency ?? 'monthly') as UsageFrequency,
    category: (editData?.category ?? 'Entertainment') as Category,
    notes: editData?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter a service name'); return; }
    if (!form.cost || isNaN(Number(form.cost))) { toast.error('Please enter a valid cost'); return; }
    if (!form.next_renewal_date) { toast.error('Please select a renewal date'); return; }

    setSaving(true);
    try {
      if (editData) {
        await updateSubscription.mutateAsync({ id: editData.id, ...form, cost: Number(form.cost) });
        toast.success('Subscription updated ✓');
      } else {
        await addSubscription.mutateAsync({ ...form, cost: Number(form.cost) });
        toast.success('Subscription added ✓');
      }
      onClose();
    } catch {
      toast.error('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(8px)', padding: 20 }}>
      <div style={{ background: 'var(--sz-bg)', borderRadius: 28, padding: 40, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{editData ? 'Edit Subscription' : 'Add Subscription'}</div>
            <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', marginTop: 4 }}>Track a new recurring expense</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--sz-gray-500)', lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label className="sz-field-label">Service Name</label>
            <input className="sz-field-input" type="text" placeholder="e.g. Netflix, Spotify, Adobe…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="sz-field-label">Cost (₹)</label>
              <input className="sz-field-input" type="number" placeholder="0.00" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
            <div>
              <label className="sz-field-label">Billing Cycle</label>
              <select className="sz-field-input" value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value as BillingCycle }))}>
                {BILLING_CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="sz-field-label">Next Renewal</label>
              <input className="sz-field-input" type="date" value={form.next_renewal_date} onChange={e => setForm(f => ({ ...f, next_renewal_date: e.target.value }))} />
            </div>
            <div>
              <label className="sz-field-label">Usage Frequency</label>
              <select className="sz-field-input" value={form.usage_frequency} onChange={e => setForm(f => ({ ...f, usage_frequency: e.target.value as UsageFrequency }))}>
                {USAGE_FREQS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="sz-field-label">Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" className={`sz-category-chip ${form.category === cat ? 'sz-selected' : ''}`} onClick={() => setForm(f => ({ ...f, category: cat }))}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="sz-field-label">Icon Emoji</label>
              <input className="sz-field-input" type="text" placeholder="📺" maxLength={4} value={form.icon_emoji} onChange={e => setForm(f => ({ ...f, icon_emoji: e.target.value }))} />
            </div>
            <div>
              <label className="sz-field-label">Icon Color</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {COLOR_PRESETS.slice(0, 8).map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, icon_color: c }))}
                    style={{ width: 28, height: 28, background: c, borderRadius: 7, border: form.icon_color === c ? '3px solid #0A0A0A' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="sz-field-label">Notes (optional)</label>
            <textarea className="sz-field-input" rows={2} placeholder="Any notes…" style={{ resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="sz-btn-primary" style={{ flex: 1, padding: 14 }} disabled={saving}>
              {saving ? 'Saving…' : editData ? 'Update Subscription →' : 'Add Subscription →'}
            </button>
            <button type="button" className="sz-btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { data: subscriptions = [], deleteSubscription, getMonthly } = useSubscriptions();
  const { data: insights = [] } = useInsights(subscriptions);
  const [activeCategory, setActiveCategory] = useState<'All' | Category>('All');
  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState<typeof subscriptions[number] | undefined>();
  const [isYearly, setIsYearly] = useState(false);

  const filtered = activeCategory === 'All' ? subscriptions : subscriptions.filter(s => s.category === activeCategory);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Cancel "${name}"? This will remove it from tracking.`)) return;
    try {
      await deleteSubscription.mutateAsync(id);
      toast.success(`${name} removed ✓`);
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">Subscriptions</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">{subscriptions.length} active · {filtered.length} showing</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Monthly/Yearly toggle */}
            <div style={{ display: 'flex', background: 'var(--sz-gray-200)', borderRadius: 100, padding: 4 }}>
              <button onClick={() => setIsYearly(false)} style={{ padding: '6px 14px', borderRadius: 100, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: !isYearly ? '#0A0A0A' : 'transparent', color: !isYearly ? 'white' : 'var(--sz-gray-500)', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" }}>Monthly</button>
              <button onClick={() => setIsYearly(true)} style={{ padding: '6px 14px', borderRadius: 100, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: isYearly ? '#0A0A0A' : 'transparent', color: isYearly ? 'white' : 'var(--sz-gray-500)', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" }}>Yearly</button>
            </div>
            <button className="sz-btn-primary" style={{ fontSize: 14, padding: '10px 20px' }} onClick={() => { setEditSub(undefined); setShowModal(true); }}>
              + Add Subscription
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {(['All', ...CATEGORIES] as const).map(cat => (
            <button key={cat} className={`sz-filter-tab ${activeCategory === cat ? 'sz-active' : ''}`} onClick={() => setActiveCategory(cat as typeof activeCategory)}>
              {cat}
            </button>
          ))}
        </div>

        {/* Subscriptions Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--sz-gray-500)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>No subscriptions here</div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>Add your first subscription to start tracking</div>
            <button className="sz-btn-primary" onClick={() => setShowModal(true)}>+ Add Subscription</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
            {filtered.map(sub => {
              const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
              const bg = sub.icon_color || '#0A0A0A';
              const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
              const monthly = getMonthly(sub);
              const displayCost = isYearly ? monthly * 12 : monthly;
              const renewalDate = sub.next_renewal_date ? new Date(sub.next_renewal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
              const badgeClass = sub.usage_frequency === 'never' || sub.usage_frequency === 'rare' ? 'sz-badge-unused' : monthly > 1000 ? 'sz-badge-expensive' : 'sz-badge-ok';
              const badgeText = sub.usage_frequency === 'never' ? 'Unused' : sub.usage_frequency === 'rare' ? 'Rarely used' : monthly > 1000 ? 'High cost' : 'Active';

              return (
                <div key={sub.id} className="sz-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: isEmoji ? 'var(--sz-gray-100)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: isEmoji ? 22 : 16, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button title="Edit" onClick={() => { setEditSub(sub); setShowModal(true); }}
                        style={{ background: 'none', border: '1.5px solid var(--sz-gray-200)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget).style.background = 'var(--sz-gray-100)'; }}
                        onMouseLeave={e => { (e.currentTarget).style.background = 'none'; }}
                      >✏️</button>
                      <button title="Remove" onClick={() => handleDelete(sub.id, sub.name)}
                        style={{ background: 'none', border: '1.5px solid #FECACA', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget).style.background = '#FEF2F2'; }}
                        onMouseLeave={e => { (e.currentTarget).style.background = 'none'; }}
                      >🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, letterSpacing: -0.3 }}>{sub.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                    <span className={`sz-sub-badge ${badgeClass}`}>{badgeText}</span>
                    <span style={{ fontSize: 11, color: 'var(--sz-gray-500)' }}>{sub.category}</span>
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: '#0A0A0A', marginBottom: 4 }}>
                    {fmtCurrency(displayCost)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>
                    {isYearly ? '/year' : `/${sub.billing_cycle}`} · Renews {renewalDate}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sub.usage_frequency === 'daily' || sub.usage_frequency === 'weekly' ? '#16a34a' : sub.usage_frequency === 'monthly' ? '#f59e0b' : '#dc2626' }} />
                    <span style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>Used {sub.usage_frequency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddSubscriptionModal
          onClose={() => { setShowModal(false); setEditSub(undefined); }}
          editData={editSub}
        />
      )}
    </div>
  );
}
