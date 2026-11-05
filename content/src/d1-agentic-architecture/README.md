# Domain 1 — Agentic Architecture & Orchestration (27%)

Authoring directory for Course 1. Structure follows the registry pattern (courses import units import
lessons); every `define*` call validates against the zod schema and registers into the singleton
catalog (`content/src/index.ts`).

## Layout

```
d1-agentic-architecture/
  lessons/            # one file per lesson: defineLesson({ ..., exercises: [ { ...question... } ] })
  units/              # one file per unit:   defineUnit({ ..., lessons: [importedLessonA, ...] })
  course.ts           # defineCourse({ id: 'c1', domain: 'd1', ..., units: [importedUnit1, ...] })
```

A lesson embeds its exercises inline as full `Question` objects — `defineLesson` cascade-registers
each one, so no separate `defineQuestion` call is needed for lesson-bank items. Use `defineQuestion`
only for standalone exam-register questions that are not attached to a lesson. Exams reference
questions BY ID (`defineExam({ questionIds: [...] })`).

## Pilot scope (M2)

The pilot unit is **C1-U1 "Think in Agents"** (3 lessons, ~30 questions) per
`content/curriculum-map.md`:

- `c1-u1-l1` — Workflows vs agents (predefined code paths vs model-directed loops)
- `c1-u1-l2` — The augmented LLM building block (retrieval + tools + memory)
- `c1-u1-l3` — The agentic loop (gather context -> act -> observe -> repeat; stop conditions)

## Rules (see docs/content-style-guide.md, evals/banned-copy.json)

- IDs are append-only kebab-case slugs (D3): `c1-u1-l1-q03`. Deprecate, never rename or delete.
- Author FRESH from official docs; `sourceUrls` hosts must be on `blueprint.json` `citation_allowlist`.
- Concept card: analogy FIRST, then plain explanation, exam-words strip, 3–5 key points with stable
  `kp-<concept>-N` IDs that byte-match the explain-back `keyPointIds` (GC-15d).
- Multi-select stems STATE how many to select ("Select TWO.").
- Every lesson's `estimatedSecondsTotal` (exercises + 90s explain-back) must be ≤ 300s (GC-02).
