// DEMO grading (web build only). The word-match grader must be deterministic, must only return valid
// key-point ids, and must stay off on native so the shipped app keeps its self-assessment path.

import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { demoGrade, demoGradeConcept, isDemoGrading, registerDemoKeyPoints } from '../../src/api/demo-grading';
import { requestGrading } from '../../src/api/grading';

const POINTS = [
  { id: 'kp-1', text: 'The exam is 60 questions answered in 120 minutes.' },
  { id: 'kp-2', text: 'Prep effort should track domain weight, so the 27 percent domain deserves the most study time.' },
  { id: 'kp-3', text: 'The exam covers Claude Code, the Claude Agent SDK, the Claude API, and MCP.' },
];

describe('demoGrade', () => {
  it('marks a point covered only when enough of its words appear', () => {
    const grade = demoGrade(POINTS, 'Spend most study time on the heaviest domain weight, the 27 percent one.');
    expect(grade.covered_points).toEqual(['kp-2']);
    expect(grade.missing_points).toEqual(['kp-1', 'kp-3']);
    expect(grade.next_step_hint).toBe(`Try adding this point: ${POINTS[0].text}`);
  });

  it('credits a correct explanation of a long key point in the learner\'s own words', () => {
    const weights = {
      id: 'kp-w',
      text:
        'The five domains are weighted: Agentic Architecture 27 percent, Claude Code 20 percent, Prompt ' +
        'Engineering 20 percent, Tool Design and MCP 18 percent, and Context Management 15 percent.',
    };
    const said =
      'Put the most prep into Agentic Architecture because the domains carry different weights and it is worth the most points.';
    expect(demoGrade([weights], said).covered_points).toEqual(['kp-w']);
    expect(demoGrade([weights], 'Agentic stuff matters.').covered_points).toEqual([]);
  });

  it('covers everything when every point is said', () => {
    const grade = demoGrade(
      POINTS,
      'Sixty questions in 120 minutes; prep should track domain weight with most study time on 27 percent; ' +
        'it covers Claude Code, the Agent SDK, the API and MCP.',
    );
    expect(grade.missing_points).toEqual([]);
    expect(grade.simple_score).toBe(5);
  });

  it('returns only known key-point ids and a 1 to 5 score', () => {
    const grade = demoGrade(POINTS, '');
    expect([...grade.covered_points, ...grade.missing_points].sort()).toEqual(['kp-1', 'kp-2', 'kp-3']);
    expect(grade.simple_score).toBe(1);
  });

  it('grades a registered concept and returns null for an unknown one', () => {
    registerDemoKeyPoints({ 'concept-a': POINTS });
    expect(demoGradeConcept('concept-a', 'questions minutes')?.covered_points).toEqual(['kp-1']);
    expect(demoGradeConcept('concept-b', 'anything')).toBeNull();
  });
});

describe('native builds', () => {
  it('never use the demo grader', async () => {
    expect(isDemoGrading).toBe(false);
    registerDemoKeyPoints({ 'concept-a': POINTS });
    await expect(
      requestGrading({ conceptId: 'concept-a', transcript: 'questions minutes', clientSubmissionId: 'x' }),
    ).resolves.toEqual({ kind: 'degraded', reason: 'no-server' });
  });
});
