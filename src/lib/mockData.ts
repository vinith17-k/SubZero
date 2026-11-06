// Demo mode mock data — fully offline, no Supabase required
import type { Subscription } from '@/hooks/useSubscriptions';

export const DEMO_USER_ID = 'demo-user-local';

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: 'demo@subzero.app',
  user_metadata: { full_name: 'Demo User' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const today = new Date();
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r.toISOString().split('T')[0];
};

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'demo-1',
    user_id: DEMO_USER_ID,
    name: 'Netflix',
    cost: 649,
    billing_cycle: 'monthly',
    category: 'Entertainment',
    usage_frequency: 'never',
    is_active: true,
    next_renewal_date: addDays(today, 5),
    icon_emoji: 'N',
    icon_color: '#E50914',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    user_id: DEMO_USER_ID,
    name: 'Spotify',
    cost: 119,
    billing_cycle: 'monthly',
    category: 'Music',
    usage_frequency: 'daily',
    is_active: true,
    next_renewal_date: addDays(today, 12),
    icon_emoji: '♪',
    icon_color: '#1DB954',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    user_id: DEMO_USER_ID,
    name: 'Notion',
    cost: 320,
    billing_cycle: 'monthly',
    category: 'Productivity',
    usage_frequency: 'weekly',
    is_active: true,
    next_renewal_date: addDays(today, 18),
    icon_emoji: 'N',
    icon_color: '#000000',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    user_id: DEMO_USER_ID,
    name: 'Amazon Prime',
    cost: 1499,
    billing_cycle: 'yearly',
    category: 'Entertainment',
    usage_frequency: 'weekly',
    is_active: true,
    next_renewal_date: addDays(today, 90),
    icon_emoji: 'P',
    icon_color: '#FF9900',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    user_id: DEMO_USER_ID,
    name: 'Figma',
    cost: 1250,
    billing_cycle: 'monthly',
    category: 'Design',
    usage_frequency: 'daily',
    is_active: true,
    next_renewal_date: addDays(today, 22),
    icon_emoji: 'F',
    icon_color: '#F24E1E',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-6',
    user_id: DEMO_USER_ID,
    name: 'Adobe Creative Cloud',
    cost: 4230,
    billing_cycle: 'monthly',
    category: 'Design',
    usage_frequency: 'rare',
    is_active: true,
    next_renewal_date: addDays(today, 8),
    icon_emoji: 'A',
    icon_color: '#FF0000',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-7',
    user_id: DEMO_USER_ID,
    name: 'Hotstar',
    cost: 299,
    billing_cycle: 'monthly',
    category: 'Entertainment',
    usage_frequency: 'rare',
    is_active: true,
    next_renewal_date: addDays(today, 3),
    icon_emoji: 'H',
    icon_color: '#1F80E0',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export interface MockInsight {
  id: string;
  user_id: string;
  type: 'cancel' | 'downgrade' | 'swap' | 'warning' | 'tip';
  title: string;
  description: string;
  potential_saving: number;
  related_subscription_ids: string[];
  is_dismissed: boolean;
  created_at: string;
}

export const MOCK_INSIGHTS: MockInsight[] = [
  {
    id: 'ins-1',
    user_id: DEMO_USER_ID,
    type: 'cancel',
    title: 'Cancel Netflix — zero usage detected',
    description: 'You haven\'t opened Netflix this month. At ₹649/mo, cancelling would save ₹7,788/year.',
    potential_saving: 7788,
    related_subscription_ids: ['demo-1'],
    is_dismissed: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ins-2',
    user_id: DEMO_USER_ID,
    type: 'swap',
    title: 'Figma + Adobe CC — significant overlap',
    description: 'You use Figma daily but Adobe CC rarely. Dropping Adobe saves ₹4,230/mo with no workflow impact.',
    potential_saving: 50760,
    related_subscription_ids: ['demo-5', 'demo-6'],
    is_dismissed: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ins-3',
    user_id: DEMO_USER_ID,
    type: 'warning',
    title: 'Hotstar renews in 3 days',
    description: 'Your Hotstar subscription renews on ' + addDays(today, 3) + '. You\'ve used it twice this month — worth keeping?',
    potential_saving: 3588,
    related_subscription_ids: ['demo-7'],
    is_dismissed: false,
    created_at: new Date().toISOString(),
  },
];
