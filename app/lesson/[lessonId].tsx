// app/lesson/[lessonId].tsx — the lesson player route.
//
// Reads the lessonId path param and hands it to the LessonPlayer, which drives the whole Feynman spine
// off the persisted lesson-session store (so a mid-lesson kill resumes here at the exact question).

import { useLocalSearchParams } from 'expo-router';

import { LessonPlayer } from '@/features/lesson-player/LessonPlayer';

export default function LessonRoute() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  return <LessonPlayer lessonId={lessonId} />;
}
