// content/src/exams/index.ts
//
// Barrel that imports every exam-register module (so their defineQuestion() calls register the
// 180-question pool) and every assembled exam (so their defineExam() calls register the 3 mock
// forms + 5 mini exams). The content loader walks these files directly too; importing them here
// makes the exam surface explicit and import-order-independent. Registration is idempotent by value.

// Exam register (standalone exam-style questions, one file per domain):
import './register/d1';
import './register/d2';
import './register/d3';
import './register/d4';
import './register/d5';

// Assembled mock forms (3 × 60, pairwise disjoint):
import './mock-1';
import './mock-2';
import './mock-3';

// Assembled mini exams (one per domain):
import './mini-d1';
import './mini-d2';
import './mini-d3';
import './mini-d4';
import './mini-d5';
