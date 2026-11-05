// content/src/d3-claude-code-config/c3-u3/l2-slash-commands-skills.ts
//
// C3-U3-L2 — Slash commands and Agent Skills. Task statement 3.2 (project .claude/commands/ vs
// ~/.claude/commands/; skills in .claude/skills/ with SKILL.md frontmatter: context: fork,
// allowed-tools, argument-hint; skills = on-demand, CLAUDE.md = always-loaded). Verified 2026-07-14
// against the cited Claude Code "skills" doc.
//
// Confusion pair targeted: skills load on demand (progressive disclosure) vs CLAUDE.md always
// loaded; and skill name precedence enterprise > personal > project, which is the OPPOSITE of the
// settings precedence learned in C3-U2-L1.

import { defineLesson } from '../../index';

const SKILLS = 'https://code.claude.com/docs/en/skills';

export const l2SlashCommandsSkills = defineLesson({
  id: 'c3-u3-l2',
  title: 'Slash commands and skills',
  order: 1,
  concept: {
    conceptId: 'slash-commands-skills',
    analogy:
      'A skill is a recipe card in a box: it takes up almost no room until you pull it out to cook, ' +
      'and its name on the tab is what you call for. CLAUDE.md is more like a note taped to the fridge ' +
      'that you read every time you walk in, whether you need it or not.',
    plainExplanation:
      'A skill is a SKILL.md file with YAML frontmatter plus markdown instructions; you invoke it with ' +
      '/skill-name or Claude loads it when relevant. Custom commands have merged into skills, so ' +
      '.claude/commands/deploy.md and .claude/skills/deploy/SKILL.md both create /deploy. Skills store ' +
      'at project (.claude/skills/), personal (~/.claude/skills/), or enterprise scope, and when names ' +
      'clash enterprise overrides personal overrides project. The key tradeoff: a skill\'s body loads ' +
      'only when used (progressive disclosure), while CLAUDE.md always loads, so procedures belong in ' +
      'skills and always-true facts in CLAUDE.md. Frontmatter like allowed-tools pre-approves tools, ' +
      'disable-model-invocation makes a skill user-only, and argument-hint guides input.',
    examWords: [
      'SKILL.md',
      '/skill-name',
      '.claude/skills/',
      'on-demand vs always-loaded',
      'allowed-tools',
      'disable-model-invocation',
    ],
    keyPoints: [
      { id: 'kp-slash-commands-skills-1', text: 'A skill is a SKILL.md file with YAML frontmatter and instructions, invoked by /skill-name or loaded by Claude when relevant.' },
      { id: 'kp-slash-commands-skills-2', text: 'A skill body loads only when used (progressive disclosure), while CLAUDE.md always loads, so procedures go in skills and standing facts in CLAUDE.md.' },
      { id: 'kp-slash-commands-skills-3', text: 'Skills live at project, personal (~/.claude/skills/), or enterprise scope, and on a name clash enterprise overrides personal overrides project.' },
      { id: 'kp-slash-commands-skills-4', text: 'Frontmatter tunes behavior: allowed-tools pre-approves tools while active, disable-model-invocation makes a skill user-only, and argument-hint guides expected input.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u3-l2-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You have a multi-step deployment procedure you only want in context when you actually deploy. Where does it belong?',
      options: [
        'A skill (SKILL.md), whose body loads only when invoked',
        'The project CLAUDE.md, which loads every session',
        'A user CLAUDE.md at ~/.claude/CLAUDE.md',
        'A managed-policy CLAUDE.md',
      ],
      answerKey: 0,
      explanation:
        'A skill body loads only when used, so a long procedure costs almost nothing until you run it. Putting it in CLAUDE.md ' +
        'is the trap: CLAUDE.md loads every session and would spend that context whether or not you are deploying.',
      misconceptionTag: 'skill-on-demand-vs-claude-md',
      sourceUrls: [SKILLS],
    },
    {
      id: 'c3-u3-l2-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A teammate says skills and CLAUDE.md load the same way. What is the key difference?',
      options: [
        'A skill\'s body loads only when it is invoked, while CLAUDE.md loads in full every session',
        'They are the same; both load only when invoked',
        'CLAUDE.md loads on demand and skills load every session',
        'Neither one is ever loaded into context',
      ],
      answerKey: 0,
      explanation:
        'Skills use progressive disclosure, loading their body only on use, whereas CLAUDE.md is always loaded. ' +
        'The "CLAUDE.md loads on demand" answer swaps the two, which is the exact confusion to avoid.',
      misconceptionTag: 'skill-on-demand-vs-claude-md',
      sourceUrls: [SKILLS],
    },
    {
      id: 'c3-u3-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You want a /deploy command that only you can trigger, never something Claude runs on its own because your code "looks ready." Which frontmatter fits?',
      options: [
        'disable-model-invocation: true, so only you can invoke the skill',
        'user-invocable: false, so only Claude can invoke it',
        'allowed-tools with every tool listed',
        'context: fork, to run it in a subagent',
      ],
      answerKey: 0,
      explanation:
        'disable-model-invocation: true prevents Claude from auto-loading the skill, leaving it strictly user-triggered. ' +
        'user-invocable: false is the trap: it does the opposite, hiding the skill from you while letting only Claude use it.',
      misconceptionTag: 'disable-model-invocation-vs-user-invocable',
      sourceUrls: [SKILLS],
    },
    {
      id: 'c3-u3-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A developer adds allowed-tools to a skill expecting it to restrict the skill to only those tools. Other tools still work. What is the misunderstanding?',
      options: [
        'allowed-tools pre-approves the listed tools without asking; it does not restrict which tools are available',
        'allowed-tools has no effect at all and should be removed',
        'allowed-tools only works in CLAUDE.md, not skills',
        'The list needs to be in the project settings instead',
      ],
      answerKey: 0,
      explanation:
        'allowed-tools grants the listed tools without prompting while the skill is active, but every other tool remains ' +
        'callable. To remove tools from the pool you would use disallowed-tools; expecting allowed-tools to restrict is the ' +
        'misconception.',
      misconceptionTag: 'allowed-tools-preapprove-not-restrict',
      sourceUrls: [SKILLS],
    },
    {
      id: 'c3-u3-l2-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'A skill named code-review exists at both the enterprise and project scope. Which one takes effect when the names clash?',
      options: [
        'The enterprise skill, since enterprise overrides personal overrides project for skills',
        'The project skill, since more specific scopes win',
        'They both run, one after the other',
        'Neither runs until you rename one of them',
      ],
      answerKey: 0,
      explanation:
        'For skills, enterprise overrides personal overrides project on a name clash. The "more specific wins" answer borrows ' +
        'the local-over-project ordering of settings, but skill name precedence runs the opposite direction.',
      misconceptionTag: 'skill-precedence-enterprise-wins',
      sourceUrls: [SKILLS],
    },
    {
      id: 'c3-u3-l2-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are comparing custom slash commands with Agent Skills for a lunch-and-learn. Which two takeaways are correct? Select TWO.',
      options: [
        'A file at .claude/commands/deploy.md and a skill at .claude/skills/deploy/SKILL.md both create /deploy',
        'A skill can be invoked with /skill-name or loaded automatically by Claude when relevant',
        'Skills always load their full body every session, like CLAUDE.md',
        'allowed-tools removes every unlisted tool from the pool',
        'Skills cannot accept arguments',
      ],
      answerKey: [0, 1],
      explanation:
        'Custom commands merged into skills, so both paths create /deploy, and skills can be user-invoked or auto-loaded. ' +
        'The false options contradict progressive disclosure, the pre-approve (not restrict) nature of allowed-tools, and ' +
        'the $ARGUMENTS support skills provide.',
      misconceptionTag: 'commands-merged-into-skills',
      sourceUrls: [SKILLS],
    },
    {
      id: 'c3-u3-l2-q07',
      type: 'order',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these skill scopes from the one that wins a name clash to the one that loses.',
      steps: [
        'Enterprise (managed) skill',
        'Personal skill in ~/.claude/skills/',
        'Project skill in .claude/skills/',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'On a name clash, enterprise overrides personal, and personal overrides project. Note this is the reverse of the ' +
        'local-over-project-over-user precedence used for settings files.',
      misconceptionTag: 'skill-precedence-enterprise-wins',
      sourceUrls: [SKILLS],
    },
    {
      id: 'c3-u3-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'slash-commands-skills',
      taskStatement: '3.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a skill loads its full instructions into context every session, exactly like CLAUDE.md.',
      options: [
        'False, a skill body loads only when the skill is used',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Skills use progressive disclosure: the body loads only when invoked, so long reference material costs almost nothing ' +
        'until needed. CLAUDE.md is the one that always loads in full.',
      misconceptionTag: 'skill-on-demand-vs-claude-md',
      sourceUrls: [SKILLS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you have a long deployment procedure. Why put it in a skill instead of CLAUDE.md, and which frontmatter field keeps Claude from running it on its own?',
    conceptId: 'slash-commands-skills',
    keyPointIds: [
      'kp-slash-commands-skills-1',
      'kp-slash-commands-skills-2',
      'kp-slash-commands-skills-3',
      'kp-slash-commands-skills-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
