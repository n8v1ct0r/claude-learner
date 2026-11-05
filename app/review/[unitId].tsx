// app/review/[unitId].tsx — the unit-review route.
//
// Reads the unitId path param and hands it to the UnitReviewPlayer, which re-serves the whole unit's
// questions energy-free (PLAN-rev2 §4.4). Full-screen (no tab bar), like the lesson player.

import { useLocalSearchParams } from 'expo-router';

import { UnitReviewPlayer } from '@/features/path/UnitReviewPlayer';

export default function ReviewRoute() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  return <UnitReviewPlayer unitId={unitId} />;
}
