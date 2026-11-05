import { requireSupabaseClient } from '@/api/supabase';

export interface LeaderboardRow {
  rank: number;
  displayName: string;
  weeklyXp: number;
  isMe: boolean;
}

export interface LeaderboardSnapshot {
  rows: LeaderboardRow[];
  currentWeekXp: number;
  previousWeekXp: number;
}

function isoWeekStart(now: number): number {
  const date = new Date(now);
  const day = date.getUTCDay() || 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day + 1);
}

export async function fetchLeaderboard(now: number = Date.now()): Promise<LeaderboardSnapshot> {
  const client = requireSupabaseClient();
  const currentStart = isoWeekStart(now);
  const previousStart = currentStart - 7 * 86_400_000;
  const nextStart = currentStart + 7 * 86_400_000;
  const [board, ownEvents] = await Promise.all([
    client.rpc('get_leaderboard'),
    client.from('xp_events').select('amount,occurred_at')
      .gte('occurred_at', new Date(previousStart).toISOString())
      .lt('occurred_at', new Date(nextStart).toISOString()),
  ]);
  if (board.error) throw board.error;
  if (ownEvents.error) throw ownEvents.error;

  let currentWeekXp = 0;
  let previousWeekXp = 0;
  for (const event of ownEvents.data ?? []) {
    const occurredAt = Date.parse(String(event.occurred_at));
    const amount = Number(event.amount ?? 0);
    if (occurredAt >= currentStart) currentWeekXp += amount;
    else if (occurredAt >= previousStart) previousWeekXp += amount;
  }

  return {
    rows: (board.data ?? []).map((row: Record<string, unknown>) => ({
      rank: Number(row.rank),
      displayName: String(row.display_name),
      weeklyXp: Number(row.weekly_xp),
      isMe: Boolean(row.is_me),
    })),
    currentWeekXp,
    previousWeekXp,
  };
}
