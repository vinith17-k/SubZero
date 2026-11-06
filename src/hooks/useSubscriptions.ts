import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import {
  parseMeta, stringifyMeta, isFrozen, isTrial, userShareFraction,
  recordPriceChange, trialDaysLeft,
} from '@/lib/subscriptionMeta';
import { MOCK_SUBSCRIPTIONS } from '@/lib/mockData';

export type Subscription = Tables<'subscriptions'>;
export type SubscriptionInsert = TablesInsert<'subscriptions'>;
export type SubscriptionUpdate = TablesUpdate<'subscriptions'>;

export function useSubscriptions() {
  const { user, isDemoMode } = useAuth();
  const qc = useQueryClient();

  // Local state for demo mutations
  const [demoSubs, setDemoSubs] = useState<Subscription[]>(MOCK_SUBSCRIPTIONS);

  const query = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      if (isDemoMode) return demoSubs;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Subscription[];
    },
    enabled: !!user,
    // In demo mode, seed with our local state
    initialData: isDemoMode ? demoSubs : undefined,
  });

  const addSubscription = useMutation({
    mutationFn: async (sub: Omit<SubscriptionInsert, 'user_id'>) => {
      if (isDemoMode) {
        const newSub: Subscription = {
          ...sub,
          id: `demo-${Date.now()}`,
          user_id: user!.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          icon_emoji: sub.icon_emoji ?? null,
          icon_color: sub.icon_color ?? null,
          notes: sub.notes ?? null,
          next_renewal_date: sub.next_renewal_date ?? null,
          category: sub.category ?? null,
          usage_frequency: sub.usage_frequency ?? null,
        };
        setDemoSubs(prev => [newSub, ...prev]);
        return;
      }
      const { error } = await supabase.from('subscriptions').insert({ ...sub, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate & { id: string }) => {
      if (isDemoMode) {
        setDemoSubs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        return;
      }
      const { error } = await supabase.from('subscriptions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, oldCost, newCost, currentNotes }: {
      id: string; oldCost: number; newCost: number; currentNotes: string | null;
    }) => {
      const meta = recordPriceChange(currentNotes, oldCost, newCost);
      if (isDemoMode) {
        setDemoSubs(prev => prev.map(s => s.id === id ? { ...s, cost: newCost, notes: stringifyMeta(meta) } : s));
        return;
      }
      const { error } = await supabase.from('subscriptions').update({ cost: newCost, notes: stringifyMeta(meta) }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        setDemoSubs(prev => prev.map(s => s.id === id ? { ...s, is_active: false } : s));
        return;
      }
      const { error } = await supabase.from('subscriptions').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const freezeSubscription = useMutation({
    mutationFn: async ({ id, currentNotes }: { id: string; currentNotes: string | null }) => {
      const meta = { ...parseMeta(currentNotes), is_frozen: true, frozen_at: new Date().toISOString() };
      if (isDemoMode) {
        setDemoSubs(prev => prev.map(s => s.id === id ? { ...s, notes: stringifyMeta(meta) } : s));
        return;
      }
      const { error } = await supabase.from('subscriptions').update({ notes: stringifyMeta(meta) }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const unfreezeSubscription = useMutation({
    mutationFn: async ({ id, currentNotes }: { id: string; currentNotes: string | null }) => {
      const meta = { ...parseMeta(currentNotes), is_frozen: false, frozen_at: undefined };
      if (isDemoMode) {
        setDemoSubs(prev => prev.map(s => s.id === id ? { ...s, notes: stringifyMeta(meta) } : s));
        return;
      }
      const { error } = await supabase.from('subscriptions').update({ notes: stringifyMeta(meta) }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const all = (isDemoMode ? demoSubs : query.data) ?? [];
  const activeSubs = all.filter(s => s.is_active && !isFrozen(s.notes));
  const frozenSubs = all.filter(s => s.is_active && isFrozen(s.notes));
  const trialSubs = all.filter(s => isTrial(s.notes));
  const urgentTrials = trialSubs.filter(s => {
    const days = trialDaysLeft(s.notes);
    return days !== null && days >= 0 && days <= 3;
  });

  const getFullMonthly = (sub: Subscription): number => {
    if (sub.billing_cycle === 'yearly') return sub.cost / 12;
    if (sub.billing_cycle === 'quarterly') return sub.cost / 3;
    return sub.cost;
  };

  const getMonthly = (sub: Subscription): number => {
    if (isFrozen(sub.notes)) return 0;
    const full = getFullMonthly(sub);
    return full * userShareFraction(sub.notes);
  };

  const totalMonthly = activeSubs.reduce((sum, s) => sum + getMonthly(s), 0);
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
