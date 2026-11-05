import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReplayXpEvent { id: string; amount: number; source: 'lesson' | 'exam' | 'quest' | 'achievement' | 'practice'; sourceId: string; occurredAt: number }

export async function replayXpEvents(client: SupabaseClient, userId: string, events: readonly ReplayXpEvent[]): Promise<{ error: string | null }> {
  if (events.length === 0) return { error: null };
  const { error } = await client.from('xp_events').upsert(
    events.map((event) => ({ user_id: userId, amount: event.amount, source: event.source, source_id: event.sourceId, client_event_id: event.id, occurred_at: new Date(event.occurredAt).toISOString() })),
    { onConflict: 'client_event_id', ignoreDuplicates: true },
  );
  return { error: error?.message ?? null };
}
