import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DEMO_USER_ID, MOCK_SUBSCRIPTIONS } from '@/lib/mockData';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import {
  parseMeta, stringifyMeta, isFrozen, isTrial, userShareFraction,
  recordPriceChange, trialDaysLeft,
} from '@/lib/subscriptionMeta';

export type Subscription = Tables<'subscriptions'>;
export type SubscriptionInsert = TablesInsert<'subscriptions'>;
export type SubscriptionUpdate = TablesUpdate<'subscriptions'>;

const LOCAL_KEY = 'sz_offline_subscriptions';

function readLocalSubscriptions(): Subscription[] {
  const saved = localStorage.getItem(LOCAL_KEY);
  if (!saved) return MOCK_SUBSCRIPTIONS;
  try {
    return JSON.parse(saved) as Subscription[];
  } catch {
    return MOCK_SUBSCRIPTIONS;
  }
}

function writeLocalSubscriptions(subscriptions: Subscription[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(subscriptions));
}

export function useSubscriptions() {
  const { user, isDemoMode } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      if (isDemoMode) return readLocalSubscriptions();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)          // still fetch all active (includes frozen)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Subscription[];
    },
    enabled: !!user,
  });

  const addSubscription = useMutation({
    mutationFn: async (sub: Omit<SubscriptionInsert, 'user_id'>) => {
      if (isDemoMode) {
        const subscriptions = readLocalSubscriptions();
        writeLocalSubscriptions([...subscriptions, {
          ...sub,
          id: crypto.randomUUID(),
          user_id: DEMO_USER_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Subscription]);
        return;
      }
      const { error } = await supabase
        .from('subscriptions')
        .insert({ ...sub, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate & { id: string }) => {
      if (isDemoMode) {
        const subscriptions = readLocalSubscriptions().map(subscription =>
          subscription.id === id ? { ...subscription, ...updates, updated_at: new Date().toISOString() } : subscription
        );
        writeLocalSubscriptions(subscriptions);
        return;
      }
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  /** Update cost and automatically log price history in meta */
  const updateCost = useMutation({
    mutationFn: async ({ id, oldCost, newCost, currentNotes }: {
      id: string; oldCost: number; newCost: number; currentNotes: string | null;
    }) => {
      const meta = recordPriceChange(currentNotes, oldCost, newCost);
      if (isDemoMode) {
        const subscriptions = readLocalSubscriptions().map(subscription =>
          subscription.id === id ? { ...subscription, cost: newCost, notes: stringifyMeta(meta), updated_at: new Date().toISOString() } : subscription
        );
        writeLocalSubscriptions(subscriptions);
        return;
      }
      const { error } = await supabase
        .from('subscriptions')
        .update({ cost: newCost, notes: stringifyMeta(meta) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        const subscriptions = readLocalSubscriptions().map(subscription =>
          subscription.id === id ? { ...subscription, is_active: false, updated_at: new Date().toISOString() } : subscription
        );
        writeLocalSubscriptions(subscriptions);
        return;
      }
      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  /** Freeze a subscription (exclude from totals, show frost treatment) */
  const freezeSubscription = useMutation({
    mutationFn: async ({ id, currentNotes }: { id: string; currentNotes: string | null }) => {
      const meta = { ...parseMeta(currentNotes), is_frozen: true, frozen_at: new Date().toISOString() };
      if (isDemoMode) {
        const subscriptions = readLocalSubscriptions().map(subscription =>
          subscription.id === id ? { ...subscription, notes: stringifyMeta(meta) } : subscription
        );
        writeLocalSubscriptions(subscriptions);
        return;
      }
      const { error } = await supabase
        .from('subscriptions')
        .update({ notes: stringifyMeta(meta) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  /** Unfreeze a subscription (restore to totals) */
  const unfreezeSubscription = useMutation({
    mutationFn: async ({ id, currentNotes }: { id: string; currentNotes: string | null }) => {
      const meta = { ...parseMeta(currentNotes), is_frozen: false, frozen_at: undefined };
      if (isDemoMode) {
        const subscriptions = readLocalSubscriptions().map(subscription =>
          subscription.id === id ? { ...subscription, notes: stringifyMeta(meta) } : subscription
        );
        writeLocalSubscriptions(subscriptions);
        return;
      }
      const { error } = await supabase
        .from('subscriptions')
        .update({ notes: stringifyMeta(meta) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  // ── Derived lists ──────────────────────────────────────────────────────────

  const all = query.data ?? [];

  /** Active (non-frozen, non-trial-expired) subscriptions */
  const activeSubs = all.filter(s => !isFrozen(s.notes));

  /** Frozen subscriptions */
  const frozenSubs = all.filter(s => isFrozen(s.notes));

  /** Trial subscriptions */
  const trialSubs = all.filter(s => isTrial(s.notes));

  /** Trials ending in ≤3 days */
  const urgentTrials = trialSubs.filter(s => {
    const days = trialDaysLeft(s.notes);
    return days !== null && days >= 0 && days <= 3;
  });

  // ── Cost helpers ───────────────────────────────────────────────────────────

  /** Full cost normalised to monthly (ignoring share) */
  const getFullMonthly = (sub: Subscription): number => {
    if (sub.billing_cycle === 'yearly') return sub.cost / 12;
    if (sub.billing_cycle === 'quarterly') return sub.cost / 3;
    return sub.cost;
  };

  /** User's share of monthly cost (respects household split & frozen state) */
  const getMonthly = (sub: Subscription): number => {
    if (isFrozen(sub.notes)) return 0; // frozen = doesn't count
    const full = getFullMonthly(sub);
    return full * userShareFraction(sub.notes);
  };

  /** Total monthly spend (active, non-frozen, respects share) */
  const totalMonthly = activeSubs.reduce((sum, s) => sum + getMonthly(s), 0);

  /** Total frozen monthly (for display in Analytics) */
  const totalFrozenMonthly = frozenSubs.reduce((sum, s) => sum + getFullMonthly(s), 0);

  return {
    ...query,
    data: all,
    activeSubs,
    frozenSubs,
    trialSubs,
    urgentTrials,
    addSubscription,
    updateSubscription,
    updateCost,
    deleteSubscription,
    freezeSubscription,
    unfreezeSubscription,
    getMonthly,
    getFullMonthly,
    totalMonthly,
    totalFrozenMonthly,
  };
}
