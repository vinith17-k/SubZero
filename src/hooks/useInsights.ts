import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { Subscription } from './useSubscriptions';
import { parseMeta, isFrozen, trialDaysLeft, recentPriceChange } from '@/lib/subscriptionMeta';
import { MOCK_INSIGHTS } from '@/lib/mockData';

export type AiInsight = Tables<'ai_insights'>;

// ── Local-only insight types (extend beyond DB enum) ──────────────────────────
export type InsightType = AiInsight['type'] | 'overlap' | 'trial' | 'price_hike';

export interface RichInsight extends Omit<AiInsight, 'type'> {
  type: InsightType;
  /** ids of subscriptions in an overlap group (for side-by-side compare) */
  compare_ids?: string[];
}

// ── Cost helper (same logic as useSubscriptions) ──────────────────────────────
function monthly(s: Subscription): number {
  if (s.billing_cycle === 'yearly') return s.cost / 12;
  if (s.billing_cycle === 'quarterly') return s.cost / 3;
  return s.cost;
}

// ── Server-side insight generators ────────────────────────────────────────────
function generateServerInsights(subscriptions: Subscription[], userId: string): TablesInsert<'ai_insights'>[] {
  const insights: TablesInsert<'ai_insights'>[] = [];

  for (const sub of subscriptions) {
    if (isFrozen(sub.notes)) continue; // skip frozen
    const m = monthly(sub);

    if (sub.usage_frequency === 'never') {
      insights.push({
        user_id: userId,
        type: 'cancel',
        title: `Cancel ${sub.name} — zero usage detected`,
        description: `You've never used ${sub.name}. At ₹${Math.round(m)}/mo, that's ₹${Math.round(m * 12)}/year completely wasted. Cancel immediately.`,
        potential_saving: m * 12,
        related_subscription_ids: [sub.id],
        is_dismissed: false,
      });
    } else if (sub.usage_frequency === 'rare') {
      insights.push({
        user_id: userId,
        type: 'downgrade',
        title: `Downgrade ${sub.name} — rarely used`,
        description: `${sub.name} is used very rarely but costs ₹${Math.round(m)}/mo. Consider a cheaper plan or pause for a month.`,
        potential_saving: m * 6,
        related_subscription_ids: [sub.id],
        is_dismissed: false,
      });
    }
  }

  // Category overlap (2+ active in same category, combined > ₹400/mo)
  const byCategory: Record<string, Subscription[]> = {};
  for (const sub of subscriptions) {
    if (isFrozen(sub.notes)) continue;
    const cat = sub.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(sub);
  }
  for (const [cat, subs] of Object.entries(byCategory)) {
    if (subs.length >= 2) {
      const combined = subs.reduce((sum, s) => sum + monthly(s), 0);
      if (combined > 400) {
        insights.push({
          user_id: userId,
          type: 'swap',
          title: `${cat} overlap: ${subs.map(s => s.name).join(' & ')}`,
          description: `You have ${subs.length} ${cat} subscriptions totalling ₹${Math.round(combined)}/mo. Consider consolidating to one service.`,
          potential_saving: combined * 0.5 * 12,
          related_subscription_ids: subs.map(s => s.id),
          is_dismissed: false,
        });
      }
    }
  }

  return insights.slice(0, 5);
}

// ── Client-side insight generators (no DB — derived on the fly) ───────────────

/** Overlap Detector: flags 2+ active subscriptions in the same category */
function generateOverlapInsights(subscriptions: Subscription[]): RichInsight[] {
  const byCategory: Record<string, Subscription[]> = {};
  for (const sub of subscriptions) {
    if (isFrozen(sub.notes)) continue;
    const cat = sub.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(sub);
  }
  const insights: RichInsight[] = [];
  for (const [cat, subs] of Object.entries(byCategory)) {
    if (subs.length < 2) continue;
    const totalMonthly = subs.reduce((s, sub) => s + monthly(sub), 0);
    const nameList = subs.map(s => `${s.name} ₹${Math.round(monthly(s))}/mo`).join(', ');
    insights.push({
      id: `overlap-${cat}`,
      user_id: '',
      type: 'overlap',
      title: `${subs.length} ${cat} subscriptions detected`,
      description: `You're paying for ${nameList}. Consider keeping just one — you could save up to ₹${Math.round(totalMonthly * 0.5)}/mo.`,
      potential_saving: totalMonthly * 0.5 * 12,
      related_subscription_ids: subs.map(s => s.id),
      compare_ids: subs.map(s => s.id),
      is_dismissed: false,
      created_at: new Date().toISOString(),
    });
  }
  return insights;
}

/** Free Trial Countdown: alerts for trials ending ≤ 3 days */
function generateTrialInsights(subscriptions: Subscription[]): RichInsight[] {
  return subscriptions
    .filter(s => !isFrozen(s.notes))
    .flatMap(s => {
      const days = trialDaysLeft(s.notes);
      if (days === null || days < 0 || days > 3) return [];
      const m = monthly(s);
      return [{
        id: `trial-${s.id}`,
        user_id: '',
        type: 'trial' as InsightType,
        title: days === 0
          ? `${s.name} trial ends TODAY — starts charging ₹${Math.round(m)}/mo`
          : `${s.name} trial ends in ${days} day${days !== 1 ? 's' : ''}`,
        description: `Your ${s.name} free trial converts to ₹${Math.round(m)}/mo${days === 0 ? ' today' : ` in ${days} day${days !== 1 ? 's' : ''}`}. Cancel now if you don't want to be charged.`,
        potential_saving: m * 12,
        related_subscription_ids: [s.id],
        is_dismissed: false,
        created_at: new Date().toISOString(),
      } as RichInsight];
    });
}

/** Price Hike Tracker: surfaces recent price increases */
function generatePriceHikeInsights(subscriptions: Subscription[]): RichInsight[] {
  return subscriptions
    .filter(s => !isFrozen(s.notes))
    .flatMap(s => {
      const change = recentPriceChange(s.notes);
      if (!change) return [];
      const delta = change.new_cost - change.old_cost;
      const date = new Date(change.changed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const annualDelta = s.billing_cycle === 'yearly' ? delta : s.billing_cycle === 'quarterly' ? delta * 4 : delta * 12;
      return [{
        id: `price-hike-${s.id}`,
        user_id: '',
        type: 'price_hike' as InsightType,
        title: `${s.name} price increased ₹${Math.round(delta)} since ${date}`,
        description: `${s.name} went from ₹${Math.round(change.old_cost)} → ₹${Math.round(change.new_cost)} on ${date}. That's ₹${Math.round(annualDelta)} more per year than when you subscribed. Worth reconsidering?`,
        potential_saving: annualDelta,
        related_subscription_ids: [s.id],
        is_dismissed: false,
        created_at: new Date().toISOString(),
      } as RichInsight];
    });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInsights(subscriptions?: Subscription[]) {
  const { user, isDemoMode } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['insights', user?.id],
    queryFn: async () => {
      if (isDemoMode) {
        const generated: RichInsight[] = generateServerInsights(subscriptions ?? [], user!.id).map((item, index) => ({
          ...item,
          id: `local-${index}`,
          is_dismissed: false,
          created_at: new Date().toISOString(),
        })) as RichInsight[];
        return [...generated, ...MOCK_INSIGHTS.filter(insight => !insight.is_dismissed)] as unknown as RichInsight[];
      }
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Auto-generate server insights if none exist
      if (data.length === 0 && subscriptions && subscriptions.length > 0) {
        const generated = generateServerInsights(subscriptions, user!.id);
        if (generated.length > 0) {
          const { data: inserted, error: insertErr } = await supabase
            .from('ai_insights')
            .insert(generated)
            .select();
          if (!insertErr && inserted) return inserted as AiInsight[];
        }
      }
      return data as AiInsight[];
    },
    enabled: !!user,
  });

  const dismissInsight = useMutation({
    mutationFn: async (id: string) => {
      // Local-only insights (overlap/trial/price_hike) have prefixed IDs
      if (id.startsWith('overlap-') || id.startsWith('trial-') || id.startsWith('price-hike-')) {
        // Nothing to dismiss in DB — handled via local state in the page
        return;
      }
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });

  // Combine DB insights with client-generated ones
  const dbInsights: RichInsight[] = (query.data ?? []).map(i => ({ ...i, type: i.type as InsightType }));
  const overlapInsights = generateOverlapInsights(subscriptions ?? []);
  const trialInsights = generateTrialInsights(subscriptions ?? []);
  const priceHikeInsights = generatePriceHikeInsights(subscriptions ?? []);

  // De-duplicate: if DB already has an overlap insight for same category, skip local one
  const dbTitles = new Set(dbInsights.map(i => i.title));
  const filteredOverlap = overlapInsights.filter(i => !dbTitles.has(i.title));

  const allInsights: RichInsight[] = [
    ...trialInsights,       // highest urgency first
    ...priceHikeInsights,
    ...filteredOverlap,
    ...dbInsights,
  ];

  const totalSavings = allInsights.reduce((sum, i) => sum + (i.potential_saving ?? 0), 0);

  return {
    ...query,
    data: allInsights,
    dismissInsight,
    totalSavings,
  };
}
