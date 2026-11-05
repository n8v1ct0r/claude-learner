// Learner-facing names for the six production scenario families used across lessons, Practice, and
// mock exams. Keeping them centralized prevents the same scenario from changing names by surface.

export const SCENARIO_LABELS: Record<string, string> = {
  'customer-support-resolution-agent': 'Customer support agent',
  'code-generation-claude-code': 'Claude Code delivery',
  'multi-agent-research-system': 'Multi-agent research',
  'developer-productivity-tools': 'Developer productivity',
  'claude-code-ci-cd': 'Claude Code in CI/CD',
  'structured-data-extraction': 'Structured extraction',
};

export function scenarioLabel(scenarioId: string): string {
  return SCENARIO_LABELS[scenarioId] ?? scenarioId;
}
