import { useState, useMemo } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import type { Subscription } from '@/hooks/useSubscriptions';
import { useInsights } from '@/hooks/useInsights';
import { toast } from 'sonner';
import { fmtCurrency, daysUntil } from '@/lib/format';
import {
  parseMeta, stringifyMeta, isFrozen, isTrial,
  trialDaysLeft, recentPriceChange, VAULT_PRESETS,
} from '@/lib/subscriptionMeta';
import type { SubscriptionMeta, SplitMember } from '@/lib/subscriptionMeta';
import type { Database } from '@/integrations/supabase/types';

type Category = Database['public']['Enums']['subscription_category'];
type BillingCycle = Database['public']['Enums']['billing_cycle'];
type UsageFrequency = Database['public']['Enums']['usage_frequency'];

const CATEGORIES: Category[] = ['Entertainment', 'Productivity', 'Music', 'Design', 'Cloud', 'Health', 'Education', 'News', 'Other'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly'];
const USAGE_FREQS: UsageFrequency[] = ['daily', 'weekly', 'monthly', 'rare', 'never'];
const COLOR_PRESETS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#E50914', '#1DB954', '#FF0000', '#0078D4', '#181717', '#F24E1E'];

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
type TabFilter = 'All' | Category | 'Frozen' | 'Trials';

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
function ConfirmModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 36, maxWidth: 380, width: '90%', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Remove Subscription?</div>
        <div style={{ fontSize: 14, color: 'var(--sz-gray-500)', marginBottom: 28, lineHeight: 1.6 }}>
          Are you sure you want to remove <strong>{name}</strong>? This cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} className="sz-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', padding: '13px', borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function AddSubscriptionModal({ onClose, editData }: {
  onClose: () => void;
  editData?: Subscription;
}) {
  const { addSubscription, updateSubscription } = useSubscriptions();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);
  const defaultDate = tomorrow.toISOString().split('T')[0];
  const existingMeta: SubscriptionMeta = editData ? parseMeta(editData.notes) : {};

  const [form, setForm] = useState({
    name: editData?.name ?? '',
    cost: editData?.cost?.toString() ?? '',
    billing_cycle: (editData?.billing_cycle ?? 'monthly') as BillingCycle,
    next_renewal_date: editData?.next_renewal_date ?? defaultDate,
    icon_emoji: editData?.icon_emoji ?? '',
    icon_color: editData?.icon_color ?? '#0A0A0A',
    usage_frequency: (editData?.usage_frequency ?? 'monthly') as UsageFrequency,
    category: (editData?.category ?? 'Entertainment') as Category,
    notes_text: existingMeta.notes_text ?? '',
    is_trial: existingMeta.is_trial ?? false,
    trial_end_date: existingMeta.trial_end_date ?? '',
    login_url: existingMeta.login_url ?? '',
    cancel_url: existingMeta.cancel_url ?? '',
    user_share_pct: existingMeta.user_share_pct ?? 100,
    split_members: (existingMeta.split_members ?? []) as SplitMember[],
    is_split: (existingMeta.user_share_pct ?? 100) < 100,
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'trial' | 'vault' | 'split'>('basic');

  const applyQuickService = (svc: typeof QUICK_SERVICES[0]) => {
    const preset = VAULT_PRESETS[svc.name] ?? {};
    setForm(f => ({
      ...f,
      name: svc.name,
      icon_emoji: svc.icon_emoji,
      icon_color: svc.icon_color,
      category: svc.category,
      cost: svc.cost.toString(),
      billing_cycle: svc.billing_cycle,
      login_url: preset.login_url ?? f.login_url,
      cancel_url: preset.cancel_url ?? f.cancel_url,
    }));
  };

  const addSplitMember = () => {
    setForm(f => {
      const newMembers = [...f.split_members, { name: '', share_pct: 25 }];
      const othersTotal = newMembers.reduce((s, m) => s + m.share_pct, 0);
      return { ...f, split_members: newMembers, user_share_pct: Math.max(0, 100 - othersTotal), is_split: true };
    });
  };

  const updateSplitMember = (idx: number, field: keyof SplitMember, value: string | number) => {
    setForm(f => {
      const members = f.split_members.map((m, i) => i === idx ? { ...m, [field]: value } : m);
      const othersTotal = members.reduce((s, m) => s + Number(m.share_pct), 0);
      return { ...f, split_members: members, user_share_pct: Math.max(0, 100 - othersTotal) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter a service name'); return; }
    if (!form.cost || isNaN(Number(form.cost))) { toast.error('Please enter a valid cost'); return; }

    const newCost = Number(form.cost);

    const meta: SubscriptionMeta = {
      notes_text: form.notes_text || undefined,
      is_trial: form.is_trial || undefined,
      trial_end_date: form.is_trial ? form.trial_end_date || undefined : undefined,
      login_url: form.login_url || undefined,
      cancel_url: form.cancel_url || undefined,
      user_share_pct: form.is_split ? form.user_share_pct : undefined,
      split_members: form.is_split && form.split_members.length > 0 ? form.split_members : undefined,
      is_frozen: existingMeta.is_frozen,
      frozen_at: existingMeta.frozen_at,
      price_history: editData && newCost !== editData.cost
        ? [...(existingMeta.price_history ?? []), { old_cost: editData.cost, new_cost: newCost, changed_at: new Date().toISOString() }].slice(-10)
        : existingMeta.price_history,
    };

    setSaving(true);
    try {
      if (editData) {
        await updateSubscription.mutateAsync({
          id: editData.id,
          name: form.name,
          cost: newCost,
          billing_cycle: form.billing_cycle,
          next_renewal_date: form.next_renewal_date || null,
          icon_emoji: form.icon_emoji || null,
          icon_color: form.icon_color,
          usage_frequency: form.usage_frequency,
          category: form.category,
          notes: stringifyMeta(meta),
        });
        toast.success('Subscription updated ✓');
      } else {
        await addSubscription.mutateAsync({
          name: form.name,
          cost: newCost,
          billing_cycle: form.billing_cycle,
          next_renewal_date: form.next_renewal_date || null,
          icon_emoji: form.icon_emoji || null,
          icon_color: form.icon_color,
          usage_frequency: form.usage_frequency,
          category: form.category,
          notes: stringifyMeta(meta),
        });
        toast.success('Subscription added ✓');
      }
      onClose();
    } catch {
      toast.error('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const tabStyle = (t: typeof activeTab): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 100, border: 'none', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', background: activeTab === t ? '#0A0A0A' : 'transparent',
    color: activeTab === t ? 'white' : 'var(--sz-gray-500)', transition: 'all 0.2s',
    fontFamily: "'DM Sans', sans-serif",
  });

  const monthlyCost = Number(form.cost || 0) / (form.billing_cycle === 'yearly' ? 12 : form.billing_cycle === 'quarterly' ? 3 : 1);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(8px)', padding: 20 }}>
      <div style={{ background: 'var(--sz-bg)', borderRadius: 28, padding: 36, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900 }}>
            {editData ? 'Edit Subscription' : 'Add Subscription'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--sz-gray-500)' }}>✕</button>
        </div>

        {/* Quick-add presets */}
        {!editData && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sz-gray-500)', marginBottom: 8 }}>Quick Add</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_SERVICES.map(svc => (
                <button key={svc.name} type="button" onClick={() => applyQuickService(svc)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: form.name === svc.name ? '1.5px solid #0A0A0A' : '1.5px solid var(--sz-gray-200)', borderRadius: 100, background: form.name === svc.name ? '#0A0A0A' : 'white', color: form.name === svc.name ? 'white' : 'var(--sz-gray-700)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {svc.icon_emoji} {svc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section tabs */}
        <div style={{ display: 'flex', background: 'var(--sz-gray-100)', borderRadius: 100, padding: 4, gap: 2, marginBottom: 24 }}>
          {(['basic', 'trial', 'vault', 'split'] as const).map(t => (
            <button key={t} type="button" style={tabStyle(t)} onClick={() => setActiveTab(t)}>
              {t === 'basic' ? '📋 Details' : t === 'trial' ? '⏳ Trial' : t === 'vault' ? '🔗 Vault' : '👥 Split'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── BASIC ── */}
          {activeTab === 'basic' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label className="sz-field-label">Service Name</label>
                <input className="sz-field-input" type="text" placeholder="e.g. Netflix, Spotify…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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
              <div style={{ marginBottom: 16 }}>
                <label className="sz-field-label">Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 6 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button" className={`sz-category-chip${form.category === cat ? ' sz-selected' : ''}`} onClick={() => setForm(f => ({ ...f, category: cat }))}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="sz-field-label">Icon Emoji</label>
                  <input className="sz-field-input" type="text" placeholder="🎬" maxLength={4} value={form.icon_emoji} onChange={e => setForm(f => ({ ...f, icon_emoji: e.target.value }))} />
                </div>
                <div>
                  <label className="sz-field-label">Icon Color</label>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                    {COLOR_PRESETS.slice(0, 8).map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, icon_color: c }))}
                        style={{ width: 26, height: 26, background: c, borderRadius: 7, border: form.icon_color === c ? '3px solid #0A0A0A' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="sz-field-label">Notes</label>
                <textarea className="sz-field-input" rows={2} placeholder="Any notes…" style={{ resize: 'vertical' }} value={form.notes_text} onChange={e => setForm(f => ({ ...f, notes_text: e.target.value }))} />
              </div>
            </>
          )}

          {/* ── TRIAL ── */}
          {activeTab === 'trial' && (
            <div>
              <div style={{ background: '#FFF7ED', borderRadius: 16, padding: 20, marginBottom: 20, borderLeft: '4px solid #F59E0B' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>⏳ Free Trial Tracking</div>
                <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>Mark this as a trial. SubZero will countdown and alert you 3 days before it converts to paid.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 18px', border: '1.5px solid var(--sz-gray-200)', borderRadius: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>This is a free trial</div>
                  <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>Enable countdown badge</div>
                </div>
                <button type="button" className={`sz-toggle${form.is_trial ? ' sz-on' : ''}`} onClick={() => setForm(f => ({ ...f, is_trial: !f.is_trial }))} />
              </div>
              {form.is_trial && (
                <div>
                  <label className="sz-field-label">Trial End Date</label>
                  <input className="sz-field-input" type="date" value={form.trial_end_date} onChange={e => setForm(f => ({ ...f, trial_end_date: e.target.value }))} />
                  <div style={{ fontSize: 12, color: 'var(--sz-gray-500)', marginTop: 6 }}>You'll get an AI alert 3 days before this date.</div>
                </div>
              )}
            </div>
          )}

          {/* ── VAULT ── */}
          {activeTab === 'vault' && (
            <div>
              <div style={{ background: '#EFF6FF', borderRadius: 16, padding: 20, marginBottom: 20, borderLeft: '4px solid #3B82F6' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F', marginBottom: 4 }}>🔗 Subscription Vault</div>
                <div style={{ fontSize: 13, color: '#1E3A5F', lineHeight: 1.6 }}>Save quick-access links. They appear in a Manage dropdown on each card.</div>
              </div>
              {VAULT_PRESETS[form.name] && (
                <div style={{ marginBottom: 16 }}>
                  <button type="button" onClick={() => {
                    const p = VAULT_PRESETS[form.name];
                    setForm(f => ({ ...f, login_url: p.login_url ?? '', cancel_url: p.cancel_url ?? '' }));
                    toast.success('Pre-filled vault links ✓');
                  }} style={{ background: '#0A0A0A', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    ⚡ Auto-fill {form.name} links
                  </button>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label className="sz-field-label">Login URL</label>
                <input className="sz-field-input" type="url" placeholder="https://…" value={form.login_url} onChange={e => setForm(f => ({ ...f, login_url: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="sz-field-label">Cancellation URL</label>
                <input className="sz-field-input" type="url" placeholder="https://…/cancel" value={form.cancel_url} onChange={e => setForm(f => ({ ...f, cancel_url: e.target.value }))} />
              </div>
            </div>
          )}

          {/* ── SPLIT ── */}
          {activeTab === 'split' && (
            <div>
              <div style={{ background: '#F0FDF4', borderRadius: 16, padding: 20, marginBottom: 20, borderLeft: '4px solid #16A34A' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#14532D', marginBottom: 4 }}>👥 Household Split</div>
                <div style={{ fontSize: 13, color: '#14532D', lineHeight: 1.6 }}>Divide cost among people. Dashboard totals will reflect only your share.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 18px', border: '1.5px solid var(--sz-gray-200)', borderRadius: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Split with others</div>
                  <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>Divide cost across people</div>
                </div>
                <button type="button" className={`sz-toggle${form.is_split ? ' sz-on' : ''}`} onClick={() => setForm(f => ({
                  ...f, is_split: !f.is_split,
                  split_members: !f.is_split ? [] : f.split_members,
                  user_share_pct: !f.is_split ? 50 : 100,
                }))} />
              </div>
              {form.is_split && (
                <>
                  <div style={{ background: 'var(--sz-gray-100)', borderRadius: 14, padding: '12px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>You</span>
                    <span style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Playfair Display', serif", color: '#16a34a' }}>{form.user_share_pct}%</span>
                  </div>
                  {form.split_members.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                      <input className="sz-field-input" style={{ flex: 2 }} placeholder="Person's name" value={m.name} onChange={e => updateSplitMember(i, 'name', e.target.value)} />
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input className="sz-field-input" type="number" min={0} max={100} value={m.share_pct} onChange={e => updateSplitMember(i, 'share_pct', Number(e.target.value))} style={{ paddingRight: 28 }} />
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--sz-gray-500)' }}>%</span>
                      </div>
                      <button type="button" onClick={() => setForm(f => {
                        const members = f.split_members.filter((_, j) => j !== i);
                        const othersTotal = members.reduce((s, mm) => s + mm.share_pct, 0);
                        return { ...f, split_members: members, user_share_pct: Math.max(0, 100 - othersTotal) };
                      })} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={addSplitMember}
                    style={{ width: '100%', border: '1.5px dashed var(--sz-gray-300)', borderRadius: 12, padding: '10px', background: 'none', fontSize: 13, color: 'var(--sz-gray-500)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    + Add Person
                  </button>
                  <div style={{ marginTop: 12, padding: 14, background: '#F0FDF4', borderRadius: 12, fontSize: 13, color: '#14532D' }}>
                    <strong>Your monthly cost:</strong> {fmtCurrency(monthlyCost * (form.user_share_pct / 100))}
                    {' '}(of {fmtCurrency(monthlyCost)} total)
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="sz-btn-primary" style={{ flex: 1, padding: 14 }} disabled={saving}>
              {saving ? 'Saving…' : editData ? 'Update →' : 'Add Subscription →'}
            </button>
            <button type="button" className="sz-btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Subscription Card (extracted component so useState works correctly) ────────
function SubCard({
  sub, idx, isYearly,
  getMonthly, getFullMonthly,
  onEdit, onDelete, onFreeze,
}: {
  sub: Subscription;
  idx: number;
  isYearly: boolean;
  getMonthly: (s: Subscription) => number;
  getFullMonthly: (s: Subscription) => number;
  onEdit: (s: Subscription) => void;
  onDelete: (id: string, name: string) => void;
  onFreeze: (s: Subscription) => void;
}) {
  // useState is now valid — this is a proper React component, not a callback
  const [vaultOpen, setVaultOpen] = useState(false);

  const meta = parseMeta(sub.notes);
  const frozen = isFrozen(sub.notes);
  const trial = isTrial(sub.notes);
  const trialDays = trialDaysLeft(sub.notes);
  const priceChange = recentPriceChange(sub.notes);
  const icon = sub.icon_emoji || sub.name.charAt(0).toUpperCase();
  const bg = sub.icon_color || '#0A0A0A';
  const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
  const fullMonthly = getFullMonthly(sub);
  const userMonthly = getMonthly(sub);
  const displayCost = isYearly
    ? (frozen ? fullMonthly * 12 : userMonthly * 12)
    : (frozen ? fullMonthly : userMonthly);
  const days = daysUntil(sub.next_renewal_date);
  const hasVault = !!(meta.login_url || meta.cancel_url);
  const isSplit = (meta.user_share_pct ?? 100) < 100;
  const sharePct = meta.user_share_pct ?? 100;

  const btnStyle: React.CSSProperties = {
    background: 'none', border: '1.5px solid var(--sz-gray-200)', borderRadius: 8,
    width: 30, height: 30, cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
  };

  return (
    <div
      className={`sz-card sz-fade-in${frozen ? ' sz-frozen-card' : ''}`}
      style={{ padding: 22, animationDelay: `${idx * 0.04}s`, opacity: 0, animationFillMode: 'forwards', position: 'relative' }}
    >
      {/* Badges */}
      {frozen && (
        <div style={{ position: 'absolute', top: 12, right: 12, background: '#DBEAFE', color: '#1D4ED8', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
          ❄️ Frozen
        </div>
      )}
      {trial && trialDays !== null && trialDays >= 0 && !frozen && (
        <div style={{ position: 'absolute', top: 12, right: 12, background: trialDays <= 1 ? '#FEF2F2' : '#FFF7ED', color: trialDays <= 1 ? '#dc2626' : '#ea580c', borderRadius: 100, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
          ⏳ {trialDays === 0 ? 'Ends today!' : `${trialDays}d left`}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: isEmoji ? 'var(--sz-gray-100)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: frozen ? 'grayscale(0.7)' : 'none' }}>
          <span style={{ fontSize: isEmoji ? 20 : 15, color: isEmoji ? undefined : 'white', fontWeight: 800 }}>{icon}</span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {/* Freeze / Unfreeze */}
          <button
            title={frozen ? 'Unfreeze' : 'Freeze (pause from totals)'}
            onClick={() => onFreeze(sub)}
            style={{ ...btnStyle, background: frozen ? '#DBEAFE' : 'none', border: `1.5px solid ${frozen ? '#93C5FD' : 'var(--sz-gray-200)'}` }}
          >
            {frozen ? '🔥' : '❄️'}
          </button>

          {/* Vault dropdown */}
          {hasVault && (
            <div style={{ position: 'relative' }}>
              <button title="Manage links" onClick={() => setVaultOpen(v => !v)} style={btnStyle}>🔗</button>
              {vaultOpen && (
                <div style={{ position: 'absolute', right: 0, top: 36, background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid var(--sz-gray-200)', zIndex: 200, minWidth: 170, overflow: 'hidden' }}>
                  {meta.login_url && (
                    <a href={meta.login_url} target="_blank" rel="noopener noreferrer"
                      onClick={() => setVaultOpen(false)}
                      style={{ display: 'block', padding: '10px 14px', fontSize: 13, color: '#0A0A0A', textDecoration: 'none', fontWeight: 500 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sz-gray-100)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      🔓 Open login ↗
                    </a>
                  )}
                  {meta.cancel_url && (
                    <a href={meta.cancel_url} target="_blank" rel="noopener noreferrer"
                      onClick={() => setVaultOpen(false)}
                      style={{ display: 'block', padding: '10px 14px', fontSize: 13, color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      ❌ Cancel on {sub.name} ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit */}
          <button title="Edit" onClick={() => onEdit(sub)} style={btnStyle}>✏️</button>
          {/* Delete */}
          <button title="Remove" onClick={() => onDelete(sub.id, sub.name)}
            style={{ ...btnStyle, border: '1.5px solid #FECACA' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
            🗑️
          </button>
        </div>
      </div>

      {/* Name & status */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, letterSpacing: -0.3 }}>{sub.name}</div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <span className={`sz-sub-badge ${sub.usage_frequency === 'never' || sub.usage_frequency === 'rare' ? 'sz-badge-unused' : 'sz-badge-ok'}`}>
          {sub.usage_frequency === 'never' ? 'Unused' : sub.usage_frequency === 'rare' ? 'Rarely used' : 'Active'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--sz-gray-500)' }}>{sub.category}</span>
      </div>

      {/* Cost */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, color: frozen ? 'var(--sz-gray-500)' : '#0A0A0A' }}>
          {fmtCurrency(displayCost)}
        </div>
        {priceChange && !frozen && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: 6 }}>
            ↑ +₹{Math.round(priceChange.new_cost - priceChange.old_cost)}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--sz-gray-500)', marginBottom: 6 }}>
        {frozen ? 'Frozen — not counting toward totals' : isYearly ? '/year' : `/${sub.billing_cycle}`}
        {isSplit && !frozen && ` · Your ${sharePct}% share`}
      </div>

      {/* Renewal urgency */}
      {!frozen && days >= 0 && days <= 7 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: days <= 3 ? '#FEF2F2' : '#FFF7ED', color: days <= 3 ? '#dc2626' : '#ea580c', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700, marginTop: 4 }}>
          ⚡ Renews in {days} day{days !== 1 ? 's' : ''}
        </div>
      )}

      {/* Split indicator */}
      {isSplit && !frozen && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#16a34a' }}>
          👥 Split · Full cost: {fmtCurrency(isYearly ? fullMonthly * 12 : fullMonthly)}
        </div>
      )}

      {/* Frozen since */}
      {frozen && meta.frozen_at && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#93C5FD' }}>
          ❄️ Frozen since {new Date(meta.frozen_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}

      {/* Price history trail */}
      {meta.price_history && meta.price_history.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--sz-gray-500)' }}>
          📈 {meta.price_history.map((h, i) => (
            <span key={i}>{i > 0 && ' → '}₹{Math.round(h.old_cost)}</span>
          ))} → ₹{Math.round(sub.cost)}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const {
    data: allSubs = [], activeSubs, frozenSubs, trialSubs,
    deleteSubscription, getMonthly, getFullMonthly, totalMonthly,
    freezeSubscription, unfreezeSubscription,
  } = useSubscriptions();
  const { data: insights = [] } = useInsights(allSubs);

  const [tab, setTab] = useState<TabFilter>('All');
  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | undefined>();
  const [isYearly, setIsYearly] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('cost-desc');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const displaySubs = tab === 'Frozen' ? frozenSubs
    : tab === 'Trials' ? trialSubs
    : tab === 'All' ? allSubs
    : allSubs.filter(s => s.category === tab);

  const filtered = useMemo(() => {
    let subs = displaySubs;
    if (search.trim()) {
      const q = search.toLowerCase();
      subs = subs.filter(s => s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q));
    }
    return [...subs].sort((a, b) => {
      if (sort === 'cost-desc') return getFullMonthly(b) - getFullMonthly(a);
      if (sort === 'cost-asc') return getFullMonthly(a) - getFullMonthly(b);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'renewal') return daysUntil(a.next_renewal_date) - daysUntil(b.next_renewal_date);
      return 0;
    });
  }, [displaySubs, search, sort]);

  const handleDelete = (id: string, name: string) => setConfirmDelete({ id, name });

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSubscription.mutateAsync(confirmDelete.id);
      toast.success(`${confirmDelete.name} removed ✓`);
    } catch { toast.error('Failed to remove'); }
    finally { setConfirmDelete(null); }
  };

  const handleFreeze = async (sub: Subscription) => {
    const frozen = isFrozen(sub.notes);
    try {
      if (frozen) {
        await unfreezeSubscription.mutateAsync({ id: sub.id, currentNotes: sub.notes });
        toast.success(`${sub.name} unfrozen — counting in totals again ✓`);
      } else {
        await freezeSubscription.mutateAsync({ id: sub.id, currentNotes: sub.notes });
        toast.success(`${sub.name} frozen ❄️ — excluded from spend totals`);
      }
    } catch { toast.error('Failed to update subscription'); }
  };

  const tabBtnStyle = (t: TabFilter): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 100, border: 'none', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', background: tab === t ? '#0A0A0A' : 'transparent',
    color: tab === t ? 'white' : 'var(--sz-gray-500)', transition: 'all 0.2s',
    fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <div className="sz-dashboard-layout">
      <Sidebar insightCount={insights.length} />

      <div className="sz-main-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="sz-page-heading sz-fade-in sz-fade-in-1">Subscriptions</div>
            <div className="sz-page-sub sz-fade-in sz-fade-in-2">
              {activeSubs.length} active · {fmtCurrency(totalMonthly)}/mo
              {frozenSubs.length > 0 && <span style={{ marginLeft: 8, color: '#1d4ed8', fontWeight: 600 }}>❄️ {frozenSubs.length} frozen</span>}
              {trialSubs.length > 0 && <span style={{ marginLeft: 8, color: '#b45309', fontWeight: 600 }}>⏳ {trialSubs.length} trial</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--sz-gray-200)', borderRadius: 100, padding: 3 }}>
              <button onClick={() => setIsYearly(false)} style={{ padding: '5px 13px', borderRadius: 100, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !isYearly ? '#0A0A0A' : 'transparent', color: !isYearly ? 'white' : 'var(--sz-gray-500)', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" }}>Monthly</button>
              <button onClick={() => setIsYearly(true)} style={{ padding: '5px 13px', borderRadius: 100, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: isYearly ? '#0A0A0A' : 'transparent', color: isYearly ? 'white' : 'var(--sz-gray-500)', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" }}>Yearly</button>
            </div>
            <button className="sz-btn-primary" style={{ fontSize: 13, padding: '9px 18px' }} onClick={() => { setEditSub(undefined); setShowModal(true); }}>
              + Add Subscription
            </button>
          </div>
        </div>

        {/* Search + Sort */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--sz-gray-300)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search subscriptions…"
              style={{ width: '100%', border: '1.5px solid var(--sz-gray-200)', borderRadius: 100, padding: '8px 16px 8px 38px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'white', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0A0A0A'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--sz-gray-200)'; }}
            />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
            style={{ border: '1.5px solid var(--sz-gray-200)', borderRadius: 100, padding: '8px 16px', fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, outline: 'none', background: 'white', cursor: 'pointer' }}>
            <option value="cost-desc">Highest cost first</option>
            <option value="cost-asc">Lowest cost first</option>
            <option value="name">Name A–Z</option>
            <option value="renewal">Next renewal</option>
          </select>
        </div>

        {/* Tab filters */}
        <div style={{ display: 'flex', background: 'var(--sz-gray-100)', borderRadius: 100, padding: 3, gap: 2, marginBottom: 24, flexWrap: 'wrap' }}>
          <button style={tabBtnStyle('All')} onClick={() => setTab('All')}>All ({allSubs.length})</button>
          {frozenSubs.length > 0 && <button style={tabBtnStyle('Frozen')} onClick={() => setTab('Frozen')}>❄️ Frozen ({frozenSubs.length})</button>}
          {trialSubs.length > 0 && <button style={tabBtnStyle('Trials')} onClick={() => setTab('Trials')}>⏳ Trials ({trialSubs.length})</button>}
          {CATEGORIES.filter(c => allSubs.some(s => s.category === c)).map(cat => (
            <button key={cat} style={tabBtnStyle(cat)} onClick={() => setTab(cat)}>{cat}</button>
          ))}
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--sz-gray-500)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{search ? '🔍' : tab === 'Frozen' ? '❄️' : '📭'}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
              {search ? `No results for "${search}"` : tab === 'Frozen' ? 'No frozen subscriptions yet' : 'No subscriptions here'}
            </div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>
              {search ? 'Try a different search term' : 'Add your first subscription to start tracking'}
            </div>
            {!search && tab === 'All' && (
              <button className="sz-btn-primary" onClick={() => setShowModal(true)}>+ Add Subscription</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
            {filtered.map((sub, idx) => (
              <SubCard
                key={sub.id}
                sub={sub}
                idx={idx}
                isYearly={isYearly}
                getMonthly={getMonthly}
                getFullMonthly={getFullMonthly}
                onEdit={s => { setEditSub(s); setShowModal(true); }}
                onDelete={handleDelete}
                onFreeze={handleFreeze}
              />
            ))}
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
