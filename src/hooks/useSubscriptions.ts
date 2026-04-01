import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Subscription = Tables<'subscriptions'>;
export type SubscriptionInsert = TablesInsert<'subscriptions'>;
export type SubscriptionUpdate = TablesUpdate<'subscriptions'>;

export function useSubscriptions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
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
  });

  const addSubscription = useMutation({
    mutationFn: async (sub: Omit<SubscriptionInsert, 'user_id'>) => {
      const { error } = await supabase
        .from('subscriptions')
        .insert({ ...sub, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate & { id: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  // Compute monthly cost for a subscription
  const getMonthly = (sub: Subscription) => {
    if (sub.billing_cycle === 'yearly') return sub.cost / 12;
    if (sub.billing_cycle === 'quarterly') return sub.cost / 3;
    return sub.cost;
  };

  const totalMonthly = (query.data ?? []).reduce((sum, s) => sum + getMonthly(s), 0);

  return { ...query, addSubscription, updateSubscription, deleteSubscription, getMonthly, totalMonthly };
}
