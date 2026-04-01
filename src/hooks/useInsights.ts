import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { Subscription } from './useSubscriptions';

export type AiInsight = Tables<'ai_insights'>;

function generateInsights(subscriptions: Subscription[], userId: string): TablesInsert<'ai_insights'>[] {
  const insights: TablesInsert<'ai_insights'>[] = [];

  for (const sub of subscriptions) {
    const monthlyCost = sub.billing_cycle === 'yearly' ? sub.cost / 12 : sub.billing_cycle === 'quarterly' ? sub.cost / 3 : sub.cost;

    if (sub.usage_frequency === 'never') {
      insights.push({
        user_id: userId,
        type: 'cancel',
        title: `Cancel ${sub.name} — zero usage detected`,
        description: `You've never used ${sub.name}. At ₹${Math.round(monthlyCost)}/mo, that's ₹${Math.round(monthlyCost * 12)}/year completely wasted. Cancel immediately.`,
        potential_saving: monthlyCost * 12,
        related_subscription_ids: [sub.id],
        is_dismissed: false,
      });
    } else if (sub.usage_frequency === 'rare') {
      insights.push({
        user_id: userId,
        type: 'downgrade',
        title: `Downgrade ${sub.name} — rarely used`,
        description: `${sub.name} is used very rarely but costs ₹${Math.round(monthlyCost)}/mo. Consider a cheaper plan or pause for a month to evaluate if you truly need it.`,
        potential_saving: monthlyCost * 6,
        related_subscription_ids: [sub.id],
        is_dismissed: false,
      });
    }
  }

  // Detect overlapping subscriptions by category
  const byCategory: Record<string, Subscription[]> = {};
  for (const sub of subscriptions) {
    const cat = sub.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(sub);
  }

  for (const [cat, subs] of Object.entries(byCategory)) {
    if (subs.length >= 2) {
      const combined = subs.reduce((sum, s) => {
        const m = s.billing_cycle === 'yearly' ? s.cost / 12 : s.billing_cycle === 'quarterly' ? s.cost / 3 : s.cost;
        return sum + m;
      }, 0);
      if (combined > 400) {
        insights.push({
          user_id: userId,
          type: 'swap',
          title: `${cat} overlap: ${subs.map(s => s.name).join(' & ')}`,
          description: `You have ${subs.length} ${cat} subscriptions totalling ₹${Math.round(combined)}/mo. Consider consolidating to one service and switching platforms based on which you use most.`,
          potential_saving: combined * 0.5 * 12,
          related_subscription_ids: subs.map(s => s.id),
          is_dismissed: false,
        });
      }
    }
  }

  return insights.slice(0, 5);
}

export function useInsights(subscriptions?: Subscription[]) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['insights', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Auto-generate if none exist
      if (data.length === 0 && subscriptions && subscriptions.length > 0) {
        const generated = generateInsights(subscriptions, user!.id);
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
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });

  const totalSavings = (query.data ?? []).reduce((sum, i) => sum + (i.potential_saving ?? 0), 0);

  return { ...query, dismissInsight, totalSavings };
}
