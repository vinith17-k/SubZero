/**
 * SubscriptionMeta — extended per-subscription data stored as JSON in the `notes` column.
 * This lets us add new fields without any database schema changes.
 *
 * Legacy plain-text notes are automatically migrated to { notes_text: "..." }.
 */

export interface SplitMember {
  name: string;
  share_pct: number; // 0–100
}

export interface PriceHistoryEntry {
  old_cost: number;
  new_cost: number;
  changed_at: string; // ISO datetime string
}

export interface SubscriptionMeta {
  // User-visible notes (replaces raw notes text)
  notes_text?: string;

  // ── Freeze Mode ──────────────────────────────
  is_frozen?: boolean;
  frozen_at?: string; // ISO datetime

  // ── Free Trial Countdown ──────────────────────
  is_trial?: boolean;
  trial_end_date?: string; // ISO date YYYY-MM-DD

  // ── Subscription Vault ────────────────────────
  login_url?: string;
  cancel_url?: string;

  // ── Household Split ───────────────────────────
  user_share_pct?: number;   // 0–100, defaults to 100 (no split)
  split_members?: SplitMember[];

  // ── Price History (last 10 changes) ───────────
  price_history?: PriceHistoryEntry[];
}

/** Parse JSON metadata from the `notes` column. Handles legacy plain-text gracefully. */
export function parseMeta(notes: string | null | undefined): SubscriptionMeta {
  if (!notes || !notes.trim()) return {};
  try {
    const parsed = JSON.parse(notes);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as SubscriptionMeta;
    }
    return { notes_text: notes };
  } catch {
    // Legacy: plain text notes — preserve as notes_text
    return { notes_text: notes };
  }
}

/** Serialise metadata back to a JSON string for the `notes` column. */
export function stringifyMeta(meta: SubscriptionMeta): string {
  return JSON.stringify(meta);
}

/** Get only the user-visible notes text from a `notes` column value. */
export function getNotesText(notes: string | null | undefined): string {
  return parseMeta(notes).notes_text ?? '';
}

/** Check whether a subscription is frozen. */
export function isFrozen(notes: string | null | undefined): boolean {
  return parseMeta(notes).is_frozen === true;
}

/** Check whether a subscription is a trial. */
export function isTrial(notes: string | null | undefined): boolean {
  return parseMeta(notes).is_trial === true;
}

/** Days until trial converts (negative = already converted). */
export function trialDaysLeft(notes: string | null | undefined): number | null {
  const meta = parseMeta(notes);
  if (!meta.is_trial || !meta.trial_end_date) return null;
  const diff = new Date(meta.trial_end_date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Get user's effective share fraction (0–1). Defaults to 1.0 (full cost). */
export function userShareFraction(notes: string | null | undefined): number {
  const pct = parseMeta(notes).user_share_pct;
  if (pct == null || pct <= 0) return 1;
  return pct / 100;
}

/** Get the most recent price history entry if changed in the last `days` days. */
export function recentPriceChange(
  notes: string | null | undefined,
  days = 90
): PriceHistoryEntry | null {
  const history = parseMeta(notes).price_history;
  if (!history || history.length === 0) return null;
  const latest = history[history.length - 1];
  const daysAgo = (Date.now() - new Date(latest.changed_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo > days) return null;
  return latest.new_cost > latest.old_cost ? latest : null; // only surface increases
}

/** Add a new price history entry and return the updated meta (keeps last 10). */
export function recordPriceChange(
  notes: string | null | undefined,
  oldCost: number,
  newCost: number
): SubscriptionMeta {
  const meta = parseMeta(notes);
  const entry: PriceHistoryEntry = {
    old_cost: oldCost,
    new_cost: newCost,
    changed_at: new Date().toISOString(),
  };
  const history = [...(meta.price_history ?? []), entry].slice(-10);
  return { ...meta, price_history: history };
}

/** Known cancellation/login URLs for popular services. */
export const VAULT_PRESETS: Record<string, { login_url?: string; cancel_url?: string }> = {
  Netflix: {
    login_url: 'https://netflix.com/browse',
    cancel_url: 'https://netflix.com/cancelplan',
  },
  Spotify: {
    login_url: 'https://spotify.com/account',
    cancel_url: 'https://spotify.com/account/subscription/cancel',
  },
  'Amazon Prime': {
    login_url: 'https://amazon.in/membership',
    cancel_url: 'https://amazon.in/mc/pipelines/payments',
  },
  'YouTube Premium': {
    login_url: 'https://youtube.com/paid_memberships',
    cancel_url: 'https://youtube.com/paid_memberships',
  },
  'Adobe CC': {
    login_url: 'https://account.adobe.com/plans',
    cancel_url: 'https://account.adobe.com/plans',
  },
  Notion: {
    login_url: 'https://notion.so',
    cancel_url: 'https://notion.so/profile/billing',
  },
  Figma: {
    login_url: 'https://figma.com',
    cancel_url: 'https://figma.com/settings#org',
  },
  GitHub: {
    login_url: 'https://github.com',
    cancel_url: 'https://github.com/settings/billing/summary',
  },
  'Hotstar': {
    login_url: 'https://hotstar.com',
    cancel_url: 'https://hotstar.com/in/manage-subscription',
  },
  'Apple TV+': {
    login_url: 'https://tv.apple.com',
    cancel_url: 'https://support.apple.com/billing',
  },
};
