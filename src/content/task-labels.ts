// Short, learner-facing labels for the 30 official CCA-F task statements. The full authoring truth
// remains content/official-task-statements.md; these labels make grading reports scannable on phone.

export const TASK_LABELS: Record<string, string> = {
  '1.1': 'Agentic loops',
  '1.2': 'Coordinator and subagents',
  '1.3': 'Subagent context and spawning',
  '1.4': 'Enforced workflows and handoffs',
  '1.5': 'Agent SDK hooks',
  '1.6': 'Task decomposition',
  '1.7': 'Session state and resumption',
  '2.1': 'Tool interface design',
  '2.2': 'Structured tool errors',
  '2.3': 'Tool distribution and tool_choice',
  '2.4': 'MCP servers in Claude Code',
  '2.5': 'Built-in tool selection',
  '3.1': 'CLAUDE.md hierarchy',
  '3.2': 'Commands and skills',
  '3.3': 'Path-specific rules',
  '3.4': 'Plan mode vs execution',
  '3.5': 'Iterative refinement',
  '3.6': 'Claude Code in CI/CD',
  '4.1': 'Explicit prompt criteria',
  '4.2': 'Few-shot prompting',
  '4.3': 'Structured output and schemas',
  '4.4': 'Validation and retry loops',
  '4.5': 'Batch processing',
  '4.6': 'Independent review passes',
  '5.1': 'Long-context management',
  '5.2': 'Escalation and ambiguity',
  '5.3': 'Multi-agent error propagation',
  '5.4': 'Large-codebase context',
  '5.5': 'Human review and calibration',
  '5.6': 'Provenance and uncertainty',
};

export function taskLabel(taskStatement: string): string {
  return TASK_LABELS[taskStatement] ?? `Objective ${taskStatement}`;
}
