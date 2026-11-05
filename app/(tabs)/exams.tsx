import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { useContentDb } from '@/db/content-provider';
import { ExamHub } from '@/features/exams/ExamHub';
import { ExamPlayer } from '@/features/exams/ExamPlayer';
import { ExamReport } from '@/features/exams/ExamReport';
import { useExamAttemptStore, type ExamMode } from '@/state/exam-attempt';

export default function ExamsScreen() {
  const reader = useContentDb();
  const router = useRouter();
  const activeAttempt = useExamAttemptStore((state) => state.activeAttempt);
  const start = useExamAttemptStore((state) => state.start);
  const clearActive = useExamAttemptStore((state) => state.clearActive);
  const [showSavedHub, setShowSavedHub] = useState(false);

  function startExam(examId: string, mode: ExamMode): void {
    const exam = reader.getExam(examId);
    if (!exam) return;
    start({ examId, mode, questionIds: exam.questionIds, timeLimitMinutes: exam.timeLimitMinutes, now: Date.now() });
    setShowSavedHub(false);
  }

  if (activeAttempt && !showSavedHub) {
    if (activeAttempt.completedAt !== null) {
      return (
        <ExamReport
          attempt={activeAttempt}
          onDone={() => clearActive()}
          onRelearn={(lessonId) => {
            clearActive();
            router.push(`/lesson/${lessonId}` as string as Href);
          }}
        />
      );
    }
    return <ExamPlayer attempt={activeAttempt} onExit={() => setShowSavedHub(true)} />;
  }

  return (
    <ExamHub
      activeAttempt={activeAttempt}
      onStart={startExam}
      onResume={() => setShowSavedHub(false)}
    />
  );
}
