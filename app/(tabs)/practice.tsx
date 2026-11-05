// app/(tabs)/practice.tsx — the Practice tab.
//
// A thin shell that owns the hub ↔ review-player swap. The hub hands up a capped, energy-free
// PracticeSession on launch; the player runs it and calls back to return to the hub. Sessions are
// ephemeral (not routed) — a review is disposable by design, so local state is the right home.

import { useState } from 'react';

import { PracticeHub } from '@/features/practice/PracticeHub';
import { PracticeReviewPlayer } from '@/features/practice/PracticeReviewPlayer';
import type { PracticeSession } from '@/features/practice/practice-content';

export default function PracticeScreen() {
  const [session, setSession] = useState<PracticeSession | null>(null);

  if (session) {
    return <PracticeReviewPlayer session={session} onClose={() => setSession(null)} />;
  }
  return <PracticeHub onLaunch={setSession} />;
}
