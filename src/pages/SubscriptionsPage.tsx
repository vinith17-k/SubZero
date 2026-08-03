import { useState, useMemo } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { toast } from 'sonner';
import { fmtCurrency, daysUntil } from '@/lib/format';
import type { Database } from '@/integrations/supabase/types';

type Category = Database['public']['Enums']['subscription_category'];
type BillingCycle = Database['public']['Enums']['billing_cycle'];
type UsageFrequency = Database['public']['Enums']['usage_frequency'];

const CATEGORIES: Category[] = ['Entertainment', 'Productivity', 'Music', 'Design', 'Cloud', 'Health', 'Education', 'News', 'Other'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly'];
const USAGE_FREQS: UsageFrequency[] = ['daily', 'weekly', 'monthly', 'rare', 'never'];
const COLOR_PRESETS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB347', '#E50914', '#1DB954', '#FF0000', '#0078D4'];

// Popular service quick-add presets
const QUICK_SERVICES = [
  { name: 'Netflix', icon_emoji: '🎬', icon_color: '#E50914', category: 'Entertainment' as Category, cost: 649, billing_cycle: 'monthly' as BillingCycle },
  { name: 'Spotify', icon_emoji: '🎵', icon_color: '#1DB954', category: 'Music' as Category, cost: 119, billing_cycle: 'monthly' as BillingCycle },
  { name: 'YouTube Premium', icon_emoji: '▶️', icon_color: '#FF0000', category: 'Entertainment' as Category, cost: 189, billing_cycle: 'monthly' as BillingCycle },
  { name: 'Amazon Prime', icon_emoji: '📦', icon_color: '#FF9900', category: 'Entertainment' as Category, cost: 299, billing_cycle: 'monthly' as BillingCycle },
  { name: 'Notion', icon_emoji: '📝', icon_color: '#000000', category: 'Productivity' as Category, cost: 800, billing_cycle: 'monthly' as BillingCycle },
  { name: 'Adobe CC', icon_emoji: '🎨', icon_color: '#FF0000', category: 'Design' as Category, cost: 1675, billing_cycle: 'monthly' as BillingCycle },
  { name: 'Figma', icon_emoji: '✏️', icon_color: '#F24E1E', category: 'Design' as Category, cost: 1200, billing_cycle: 'monthly' as BillingCycle },
  { name: 'GitHub', icon_emoji: '🐙', icon_color: '#181717', category: 'Productivity' as Category, cost: 333, billing_cycle: 'monthly' as BillingCycle },
];

type SortOption = 'cost-desc' | 'cost-asc' | 'name' | 'renewal';

interface ConfirmModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ name, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 36, maxWidth: 380, width: '90%', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Remove Subscription?</div>
        <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 28, lineHeight: 1.6 }}>
          Are you sure you want to remove <strong>{name}</strong> from tracking? This cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} className="sz-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', padding: '13px', borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

interface AddModalProps {
  onClose: () => void;
  editData?: ReturnType<typeof useSubscriptions>['data'] extends (infer T)[] ? T : never;
}

function AddSubscriptionModal({ onClose, editData }: AddModalProps) {
  const { addSubscription, updateSubscription } = useSubscriptions();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [form, setForm] = useState({
    name: editData?.name ?? '',
    cost: editData?.cost?.toString() ?? '',
    billing_cycle: (editData?.billing_cycle ?? 'monthly') as BillingCycle,
    next_renewal_date: editData?.next_renewal_date ?? defaultDate,
    icon_emoji: editData?.icon_emoji ?? '',
    icon_color: editData?.icon_color ?? '#0A0A0A',
    usage_frequency: (editData?.usage_frequency ?? 'monthly') as UsageFrequency,
    category: (editData?.category ?? 'Entertainment') as Category,
    notes: editData?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const applyQuickService = (svc: typeof QUICK_SERVICES[0]) => {
    setForm(f => ({
      ...f,
      name: svc.name,
      icon_emoji: svc.icon_emoji,
      icon_color: svc.icon_color,
      category: svc.category,
      cost: svc.cost.toString(),
      billing_cycle: svc.billing_cycle,
    }));
  };

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
      <div style={{ background: 'var(--sz-bg)', borderRadius: 28, padding: 40, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{editData ? 'Edit Subscription' : 'Add Subscription'}</div>
            <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', marginTop: 4 }}>Track a new recurring expense</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--sz-gray-500)', lineHeight: 1 }}>✕</button>
        </div>

        {!editData && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sz-gray-500)', marginBottom: 10 }}>Quick Add Popular Services</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_SERVICES.map(svc => (
                <button
                  key={svc.name}
                  type="button"
                  onClick={() => applyQuickService(svc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    border: form.name === svc.name ? '1.5px solid var(--sz-black)' : '1.5px solid var(--sz-gray-200)',
                    borderRadius: 100, background: form.name === svc.name ? 'var(--sz-black)' : 'white',
                    color: form.name === svc.name ? 'white' : 'var(--sz-gray-700)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  <span>{svc.icon_emoji}</span>
                  <span>{svc.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
                    style={{ width: 28, height: 28, background: c, borderRadius: 7, border: form.icon_color === c ? '3px solid #0A0A0A' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget).style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { (e.currentTarget).style.transform = 'scale(1)'; }}
                  />
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
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('cost-desc');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    let subs = activeCategory === 'All' ? subscriptions : subscriptions.filter(s => s.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      subs = subs.filter(s => s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q));
    }
    subs = [...subs].sort((a, b) => {
      if (sort === 'cost-desc') return getMonthly(b) - getMonthly(a);
      if (sort === 'cost-asc') return getMonthly(a) - getMonthly(b);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'renewal') return daysUntil(a.next_renewal_date) - daysUntil(b.next_renewal_date);
      return 0;
    });
    return subs;
  }, [subscriptions, activeCategory, search, sort, getMonthly]);

  const handleDelete = async (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSubscription.mutateAsync(confirmDelete.id);
      toast.success(`${confirmDelete.name} removed ✓`);
    } catch {
      toast.error('Failed to remove');
    } finally {
      setConfirmDelete(null);
    }
  };

  const totalMonthly = subscriptions.reduce((sum, s) => sum + getMonthly(s), 0);

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">Subscriptions</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">{subscriptions.length} active · {fmtCurrency(totalMonthly)}/mo total</div>
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

        {/* Search + Sort row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--sz-gray-300)', fontSize: 16 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search subscriptions…"
              style={{ width: '100%', border: '1.5px solid var(--sz-gray-200)', borderRadius: 100, padding: '9px 16px 9px 40px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'white', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0A0A0A'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--sz-gray-200)'; }}
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            style={{ border: '1.5px solid var(--sz-gray-200)', borderRadius: 100, padding: '9px 16px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, outline: 'none', background: 'white', cursor: 'pointer', color: 'var(--sz-gray-700)' }}
          >
            <option value="cost-desc">Sort: Highest cost</option>
            <option value="cost-asc">Sort: Lowest cost</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="renewal">Sort: Next renewal</option>
          </select>
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
            <div style={{ fontSize: 48, marginBottom: 16 }}>{search ? '🔍' : '📭'}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
              {search ? `No results for "${search}"` : 'No subscriptions here'}
            </div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>
              {search ? 'Try a different search term' : 'Add your first subscription to start tracking'}
            </div>
            {!search && <button className="sz-btn-primary" onClick={() => setShowModal(true)}>+ Add Subscription</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
            {filtered.map((sub, idx) => {
              const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
              const bg = sub.icon_color || '#0A0A0A';
              const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
              const monthly = getMonthly(sub);
              const displayCost = isYearly ? monthly * 12 : monthly;
              const renewalDate = sub.next_renewal_date ? new Date(sub.next_renewal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
              const days = daysUntil(sub.next_renewal_date);
              const badgeClass = sub.usage_frequency === 'never' || sub.usage_frequency === 'rare' ? 'sz-badge-unused' : monthly > 1000 ? 'sz-badge-expensive' : 'sz-badge-ok';
              const badgeText = sub.usage_frequency === 'never' ? 'Unused' : sub.usage_frequency === 'rare' ? 'Rarely used' : monthly > 1000 ? 'High cost' : 'Active';

              return (
                <div key={sub.id} className="sz-card sz-fade-in" style={{ padding: 24, animationDelay: `${idx * 0.04}s`, opacity: 0, animationFillMode: 'forwards' }}>
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
                  {days <= 7 && days >= 0 && (
                    <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: days <= 3 ? '#FEF2F2' : '#FFF7ED', color: days <= 3 ? '#dc2626' : '#ea580c', borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      ⚡ Renews in {days} day{days !== 1 ? 's' : ''}
                    </div>
                  )}
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

      {confirmDelete && (
        <ConfirmModal
          name={confirmDelete.name}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
