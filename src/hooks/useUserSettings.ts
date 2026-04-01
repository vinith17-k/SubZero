import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export type UserSettings = Tables<'user_settings'>;
export type UserSettingsUpdate = TablesUpdate<'user_settings'>;

export function useUserSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['user_settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as UserSettings;
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: UserSettingsUpdate) => {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_settings'] }),
  });

  return { ...query, updateSettings };
}
