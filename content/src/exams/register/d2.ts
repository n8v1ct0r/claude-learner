// content/src/exams/register/d2.ts
//
// EXAM REGISTER — Domain 2 (Tool Design & MCP Integration, 18%). 32 scenario-clustered,
// exam-style items registered directly via defineQuestion (NOT embedded in a lesson). These are
// harder than the lesson bank: each sits inside one of the published exam scenarios and tests an
// architectural DECISION, not a definition. Every item traces to an official task statement
// (content/official-task-statements.md, domain 2) and cites a page that was read with WebFetch on
// 2026-07-14 to confirm the answer key.
//
// Scenario spread (d2 is a primary domain in each): customer-support-resolution-agent (8),
// structured-data-extraction (7), developer-productivity-tools (9), code-generation-claude-code (5),
// multi-agent-research-system (3).
//
// Verified sources:
//   DEFINE     tool descriptions are the top selection lever; tool_choice auto/any/tool/none;
//              consolidation; namespacing; any/tool prefill suppresses natural-language text.
//   HANDLE     is_error on tool_result; write instructive, actionable error messages.
//   STRICT     strict:true guarantees schema-valid inputs; combine with any for a guaranteed call.
//   WRITING    consolidate tools; pagination/filtering; resolve UUIDs to natural-language ids.
//   MCP_CC     scopes local(~/.claude.json, default) / project(.mcp.json, shared) / user; precedence
//              local>project>user, whole entry used (no field merge); ${VAR} / ${VAR:-default}
//              expansion; MCP resources via @-mentions cut exploratory tool calls.
//   TOOLS_REF  Grep=file contents (ripgrep, respects .gitignore); Glob=filenames (ignores .gitignore
//              by default); Edit=exact unique-string replacement (no regex); Write overwrites files.

import { defineQuestion } from '../../index';

const DEFINE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools';
const HANDLE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls';
const STRICT = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use';
const WRITING = 'https://www.anthropic.com/engineering/writing-tools-for-agents';
const MCP_CC = 'https://code.claude.com/docs/en/mcp';
const TOOLS_REF = 'https://code.claude.com/docs/en/tools-reference';

// ==================================================================================================
// SCENARIO 1 — Customer Support Resolution Agent (8): 2.1 interface design, 2.2 errors, 2.3 tool_choice
// ==================================================================================================

export const regD2Q01 = defineQuestion({
  id: 'reg-d2-q01',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-descriptions',
  taskStatement: '2.1',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'Your support agent has search_articles and search_conversations, both described "Search support content." It keeps searching the wrong one. The input schemas are already correct. What is the highest-leverage fix?',
  options: [
    'Rewrite each description to say what it searches, when to use it over the other, and add an example query',
    'Pin tool_choice to search_articles on every turn so the agent never has to choose between the two',
    'Add "choose carefully between the two search tools" to the system prompt and leave the descriptions as they are',
    'Rename the tools search_a and search_b so the shorter names cost fewer tokens for the model to weigh',
  ],
  answerKey: 0,
  explanation:
    'The description is the primary tool-selection mechanism, and two tools sharing one generic line is exactly what causes misrouting; adding purpose, boundaries, and an example query resolves it. Forcing one tool is wrong because both tools are legitimately needed on different turns, so a hard force breaks the other path.',
  misconceptionTag: 'overlapping-tool-descriptions',
  sourceUrls: [DEFINE, WRITING],
});

export const regD2Q02 = defineQuestion({
  id: 'reg-d2-q02',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'structured-tool-errors',
  taskStatement: '2.2',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'The lookup_account tool returns "Operation failed" with is_error true for both an invalid account number and a downstream service outage. The agent then apologizes and gives up either way. Why is this the design flaw?',
  options: [
    'One opaque message hides whether the input needs fixing or the call needs a retry, so the agent cannot pick a recovery',
    'Setting is_error on a support tool makes the model end its turn, so the outage case should return plain text instead',
    'The message is too short to act on; error strings need a stack trace and a few hundred characters of context',
    'The tool should return an empty result on the outage so the agent treats it as "no account found" and keeps going',
  ],
  answerKey: 0,
  explanation:
    'Instructive errors let the agent recover: a validation error means correct the input, a transient error means retry, and a single "Operation failed" collapses both so it can do neither. Returning an empty result is worse because it hides the failure entirely and invites the agent to treat a broken call as "nothing found."',
  misconceptionTag: 'generic-error-message',
  sourceUrls: [HANDLE, WRITING],
});

export const regD2Q03 = defineQuestion({
  id: 'reg-d2-q03',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'structured-tool-errors',
  taskStatement: '2.2',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'A refund request is $800 but policy caps agent-issued refunds at $500. The issue_refund tool blocks it. What should the tool return so the agent behaves well?',
  options: [
    'is_error true, a non-retryable message stating the $500 cap and telling the agent to escalate',
    'is_error true with a message telling the agent to retry the same refund after a short backoff period',
    'A success result with the amount quietly reduced to $500 so the conversation keeps moving',
    'An empty result with no error flag so the agent skips the refund and moves to the next step',
  ],
  answerKey: 0,
  explanation:
    'A business-rule violation is real but not transient, so the error must read as non-retryable and explain the rule and the correct next move (escalate), which keeps the agent from looping. A retry-flavored message is the trap: it invites pointless repeated attempts at a limit that will never change on retry.',
  misconceptionTag: 'business-rule-vs-transient',
  sourceUrls: [HANDLE, WRITING],
});

export const regD2Q04 = defineQuestion({
  id: 'reg-d2-q04',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-choice',
  taskStatement: '2.3',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'On the first turn of every ticket you must load the customer record with get_customer before any other tool runs, deterministically. Which tool_choice on that first request does this?',
  options: [
    'tool_choice {"type":"tool","name":"get_customer"} to force that one tool',
    'tool_choice {"type":"any"}, which guarantees a tool call on that first turn',
    'tool_choice {"type":"auto"} plus a system prompt line saying to call get_customer first',
    'tool_choice {"type":"none"} on the first request so no other tool can run before it',
  ],
  answerKey: 0,
  explanation:
    'Forcing the specific tool by name is the only setting that guarantees get_customer and nothing else on that turn. "any" is the tempting near-miss: it guarantees a tool call but lets the model pick a different tool, so the deterministic ordering you need is not enforced.',
  misconceptionTag: 'tool-choice-any-vs-tool',
  sourceUrls: [DEFINE],
});

export const regD2Q05 = defineQuestion({
  id: 'reg-d2-q05',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-distribution',
  taskStatement: '2.3',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'One agent is wired to all 16 tools across billing, shipping, returns, and account admin. It now picks refund and cancellation tools for simple status questions. What is the best structural fix?',
  options: [
    'Give each agent only the tools its role needs, so admin tools are never offered for status work',
    'Keep all 16 tools but add "never misuse the refund or cancellation tools" to the system prompt',
    'Keep all 16 tools and set tool_choice "any" so the agent always commits to exactly one tool',
    'Keep all 16 tools and lower the sampling temperature so tool selection becomes more deterministic',
  ],
  answerKey: 0,
  explanation:
    'A large, cross-domain tool surface degrades selection and lets out-of-specialization tools get misused; scoping tools to the role removes the wrong options entirely. A prompt plea does not shrink the surface, and forcing "any" makes the agent commit to a tool without fixing which tools are on offer.',
  misconceptionTag: 'too-many-tools',
  sourceUrls: [DEFINE, WRITING],
});

export const regD2Q06 = defineQuestion({
  id: 'reg-d2-q06',
  type: 'multi',
  domain: 'd2',
  conceptId: 'tool-descriptions',
  taskStatement: '2.1',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 2,
  estimatedSeconds: 30,
  selectCount: 2,
  stem: 'Two support tools keep getting confused. Which two additions to their descriptions most reduce the misrouting? Select TWO.',
  options: [
    'Explicit "use this when… not when…" boundaries that separate the two tools',
    'Example queries that show the kind of request each tool is meant for',
    'Shorter, more generic descriptions so the model has fewer words to weigh when it picks a tool',
    'Identical descriptions so the model treats the two tools as fully interchangeable',
    'A note telling the model to always pick whichever tool is listed first',
  ],
  answerKey: [0, 1],
  explanation:
    'Descriptions steer selection, so stating when-to-use boundaries and giving representative example queries is exactly what disambiguates overlapping tools. Making descriptions generic or identical removes the very signal the model needs, and "always pick the first" is arbitrary rather than intent-based.',
  misconceptionTag: 'overlapping-tool-descriptions',
  sourceUrls: [DEFINE, WRITING],
});

export const regD2Q07 = defineQuestion({
  id: 'reg-d2-q07',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-consolidation',
  taskStatement: '2.1',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'At the start of every ticket the agent calls lookup_customer, then lookup_orders, then lookup_open_tickets, always in that order, burning three round trips before it can act. What tool design removes the churn?',
  options: [
    'One get_customer_context tool returning the customer, recent orders, and open tickets together',
    'tool_choice forcing lookup_customer, then lookup_orders, then lookup_open_tickets on the first three turns',
    'Drop lookup_orders and lookup_open_tickets and let the agent infer that data from the customer record',
    'A fourth planner tool that reports which of the three lookups the agent should call next',
  ],
  answerKey: 0,
  explanation:
    'Consolidating related lookups that always run together into one context-gathering tool collapses three round trips into one and matches the "compile relevant information at once" guidance. Forcing the same three calls keeps all three round trips; it automates the ordering but not the waste.',
  misconceptionTag: 'unconsolidated-tools',
  sourceUrls: [WRITING, DEFINE],
});

export const regD2Q08 = defineQuestion({
  id: 'reg-d2-q08',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-choice',
  taskStatement: '2.3',
  scenarioId: 'customer-support-resolution-agent',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'You want the agent to always call log_interaction on each turn AND still greet the customer in natural language first. You set tool_choice {"type":"tool","name":"log_interaction"} and the greetings vanish. Why, and what fixes it?',
  options: [
    'A forced tool prefills the assistant turn, so no text comes first; use "auto" and instruct the model to call log_interaction',
    'Your client is discarding the text block before the forced tool_use; keep the forced tool and parse the response harder',
    'Switch to tool_choice "any", which still guarantees a call but lets the model write a greeting before the tool_use block',
    'Raise max_tokens; the greeting is being cut off because the forced tool_use block consumes the output budget first',
  ],
  answerKey: 0,
  explanation:
    'With "any" or a specific "tool", the API prefills the assistant message to force the call, so the model will not emit natural-language text first; "auto" plus a clear instruction to use the tool keeps both the greeting and the call. Choosing "any" does not help because it prefills and suppresses the preamble the same way a forced tool does.',
  misconceptionTag: 'forced-tool-suppresses-text',
  sourceUrls: [DEFINE],
});

// ==================================================================================================
// SCENARIO 2 — Structured Data Extraction (7): 2.3 tool_choice, 2.1 tool-response design, 2.2 errors
// ==================================================================================================

export const regD2Q09 = defineQuestion({
  id: 'reg-d2-q09',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-choice',
  taskStatement: '2.3',
  scenarioId: 'structured-data-extraction',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'Your pipeline offers three doc-type extractors (extract_invoice, extract_receipt, extract_statement) and must never reply with prose. It should always call one, but you want the model to choose which based on the document. Which tool_choice fits?',
  options: [
    'tool_choice {"type":"any"}, so it must call one of the three but chooses which one',
    'tool_choice {"type":"tool","name":"extract_invoice"}, which forces that single extractor',
    'tool_choice {"type":"auto"}, so it decides whether to extract or to answer in prose',
    'tool_choice {"type":"none"} with a system prompt that names all three extractors',
  ],
  answerKey: 0,
  explanation:
    '"any" guarantees a tool call instead of conversational text while still letting the model select the appropriate extractor per document, which is exactly the requirement. Forcing a single named extractor is wrong because it would apply the invoice extractor to receipts and statements too.',
  misconceptionTag: 'tool-choice-any-vs-tool',
  sourceUrls: [DEFINE],
});

export const regD2Q10 = defineQuestion({
  id: 'reg-d2-q10',
  type: 'mc',
  domain: 'd2',
  conceptId: 'tool-choice',
  taskStatement: '2.3',
  scenarioId: 'structured-data-extraction',
  difficulty: 2,
  estimatedSeconds: 25,
  stem: 'You need two guarantees from an extraction call: the model definitely calls an extraction tool, and the arguments always match your JSON schema exactly. Which combination delivers both?',
  options: [
    'tool_choice {"type":"any"} with strict: true set on the extraction tool',
    'tool_choice {"type":"auto"} with strict: true, since strict mode also forces the call',
    'tool_choice {"type":"none"} plus a system prompt that spells out the JSON schema',
    'A long, detailed tool description alone, with tool_choice left at its default',
  ],
  answerKey: 0,
  explanation:
    '"any" forces a tool call and strict tool use forces the inputs to conform to the schema, so combining them gives both guarantees at once. "auto" cannot even guarantee a call, and a description alone influences but never enforces either property.',
  misconceptionTag: 'any-plus-strict',
  sourceUrls: [DEFINE, STRICT],
});

export const regD2Q11 = defineQuestion({
  id: 'reg-d2-q11',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-choice',
  taskStatement: '2.3',
  scenarioId: 'structured-data-extraction',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'You enable extended thinking so the model reasons over messy documents, and keep tool_choice {"type":"any"} to force the extractor. The API now returns a 400 error. What is the correct resolution?',
  options: [
    'Extended thinking allows only tool_choice "auto" or "none"; use "auto" and instruct the model to call the extractor',
    'Keep "any" and raise max_tokens, since the 400 means the thinking budget plus the tool call exceeded the limit',
    'Switch to tool_choice {"type":"tool","name":"extract_invoice"}, which thinking permits because it names one tool',
    'Disable strict tool use on the extractors, since grammar-constrained sampling is what conflicts with thinking',
  ],
  answerKey: 0,
  explanation:
    'With extended thinking, only tool_choice "auto" and "none" are supported; "any" and forced "tool" return an error, so you move to "auto" and steer with an instruction. Switching to a forced specific tool does not help because "tool" is rejected under extended thinking for the same reason as "any".',
  misconceptionTag: 'thinking-forbids-forced-tools',
  sourceUrls: [DEFINE],
});

export const regD2Q12 = defineQuestion({
  id: 'reg-d2-q12',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'tool-response-design',
  taskStatement: '2.1',
  scenarioId: 'structured-data-extraction',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'A chunk-retrieval tool returns document chunks keyed only by opaque ids like "c_9f3a12e0". Downstream, the model fabricates references to chunks that do not exist. Which response change most improves precision?',
  options: [
    'Return human-readable labels, such as section title and page, for each chunk instead of only an opaque id',
    'Return more chunks per call so the model has a wider pool of real ids to choose from when it cites',
    'Strip the ids and return only raw chunk text, since identifiers are what the model keeps fabricating',
    'Instruct the model to restate the full id list before it answers so that each reference is checked against it',
  ],
  answerKey: 0,
  explanation:
    'Resolving cryptic identifiers to semantically meaningful labels gives the model something interpretable to cite, which measurably improves precision and cuts fabricated references. Returning more opaque chunks worsens the problem, and stripping all identifiers removes the model\'s ability to attribute anything at all.',
  misconceptionTag: 'opaque-identifiers',
  sourceUrls: [WRITING, DEFINE],
});

export const regD2Q13 = defineQuestion({
  id: 'reg-d2-q13',
  type: 'multi',
  domain: 'd2',
  conceptId: 'tool-choice',
  taskStatement: '2.3',
  scenarioId: 'structured-data-extraction',
  difficulty: 2,
  estimatedSeconds: 30,
  selectCount: 2,
  stem: 'Which two statements about tool_choice {"type":"any"} are accurate for an extraction pipeline? Select TWO.',
  options: [
    'It requires the model to call one of the provided tools rather than reply with text',
    'It prefills the assistant turn, so the model will not emit a natural-language preamble first',
    'It forces one specific named tool of your choosing, which is why it takes a name field',
    'It merges the outputs of all provided tools into one combined tool_result for the next turn',
    'It prevents the model from using any tool at all on that request, just as omitting tools does',
  ],
  answerKey: [0, 1],
  explanation:
    '"any" guarantees some tool is called and, like a forced tool, prefills the turn so no preamble text appears before the tool_use. It does not force a specific tool (that is "tool"), it never merges outputs, and it is the opposite of "none", which blocks tool use.',
  misconceptionTag: 'tool-choice-any-semantics',
  sourceUrls: [DEFINE],
});

export const regD2Q14 = defineQuestion({
  id: 'reg-d2-q14',
  type: 'mc',
  variant: 'spot-bug',
  domain: 'd2',
  conceptId: 'tool-choice',
  taskStatement: '2.3',
  scenarioId: 'structured-data-extraction',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'A batch job sets tool_choice {"type":"tool","name":"extract_v1"} but the tools array now contains only extract_v2 after a rename. Every request 400s. Where is the bug?',
  options: [
    'A forced tool name must match a tool in the tools array, and "extract_v1" is no longer defined there',
    'Forcing a tool by name is only allowed when the tools array holds several tools, and here it holds just one',
    'tool_choice must be the string "tool" plus a separate tool_name parameter, never a nested object',
    'The tools array has to be empty when a specific tool is forced, because the forced definition is inlined',
  ],
  answerKey: 0,
  explanation:
    'Forcing a tool by name only works when that name is one of the tools you passed; after the rename the forced "extract_v1" is not in the array, so the request is invalid. The "must be a string" and "tools must be empty" options invert how tool_choice works: it is an object and the named tool must be present.',
  misconceptionTag: 'forced-tool-name-mismatch',
  sourceUrls: [DEFINE],
});

export const regD2Q15 = defineQuestion({
  id: 'reg-d2-q15',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'structured-tool-errors',
  taskStatement: '2.2',
  scenarioId: 'structured-data-extraction',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'The fetch_document tool cannot reach the source archive (auth expired), so it returns an empty document and no error flag. The extractor happily reports "no fields found." What is the correct tool behavior?',
  options: [
    'Return is_error true with a message saying access failed and why; an access failure is not an empty document',
    'Keep returning the empty document and rely on the downstream schema validator to flag the missing fields',
    'Retry the archive silently inside the tool for as long as it takes, never surfacing the failure at all',
    'Return a success result and mention the expired credentials in a note at the end of the content text',
  ],
  answerKey: 0,
  explanation:
    'An access failure is categorically different from a document that genuinely has no fields, so it must surface as an error rather than masquerade as an empty result that the extractor treats as real data. Returning an empty document or a buried note lets a broken call look like a valid finding, which is exactly the failure to avoid.',
  misconceptionTag: 'access-failure-vs-empty',
  sourceUrls: [HANDLE, WRITING],
});

// ==================================================================================================
// SCENARIO 3 — Developer Productivity Tools (9): 2.4 MCP in Claude Code, 2.5 built-in tools, 2.1
// ==================================================================================================

export const regD2Q16 = defineQuestion({
  id: 'reg-d2-q16',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'mcp-config-scopes',
  taskStatement: '2.4',
  scenarioId: 'developer-productivity-tools',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'A team\'s Postgres MCP server lives only in one engineer\'s personal config, so new hires cloning the repo cannot see it. You want everyone to get it automatically from the checkout. Where should it be defined?',
  options: [
    'Project scope, in a .mcp.json committed at the repository root',
    'Local scope, so it stays in ~/.claude.json for that project path',
    'User scope, so it loads in every project on the machine that has it',
    'A per-developer .env file each new hire edits after cloning',
  ],
  answerKey: 0,
  explanation:
    'Project scope stores the server in .mcp.json at the repo root, which is designed to be version-controlled so every teammate gets it on clone. Local and user scope both live in ~/.claude.json and stay private to one machine, so neither reaches new hires through the repository.',
  misconceptionTag: 'mcp-scope-project-vs-local',
  sourceUrls: [MCP_CC],
});

export const regD2Q17 = defineQuestion({
  id: 'reg-d2-q17',
  type: 'mc',
  variant: 'spot-bug',
  domain: 'd2',
  conceptId: 'mcp-config-scopes',
  taskStatement: '2.4',
  scenarioId: 'developer-productivity-tools',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'You are committing a project-scoped .mcp.json for an HTTP server that needs an API key in its Authorization header. Which entry shares the config without leaking the secret into git?',
  options: [
    '"headers": { "Authorization": "Bearer ${API_KEY}" } and set API_KEY in each machine\'s environment',
    '"headers": { "Authorization": "Bearer sk-live-9f3a...c21" } pasted in, since .mcp.json is only read locally',
    '"headers": { "Authorization": "Bearer ${API_KEY}" } with API_KEY defined in a committed .env at the repo root',
    'Store the raw key in the repository README so each teammate pastes it into the header',
  ],
  answerKey: 0,
  explanation:
    'Claude Code expands ${API_KEY} from the environment inside .mcp.json headers, so the shared file references the secret without ever containing it. Pasting the literal token or putting it in the README commits the credential to version control, which is the exact leak env-var expansion exists to prevent.',
  misconceptionTag: 'secret-in-mcp-config',
  sourceUrls: [MCP_CC],
});

export const regD2Q18 = defineQuestion({
  id: 'reg-d2-q18',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'mcp-config-scopes',
  taskStatement: '2.4',
  scenarioId: 'developer-productivity-tools',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'The server "db" is defined at project scope (url from .mcp.json) and at local scope (different command, in ~/.claude.json). A teammate expects Claude Code to combine the project url with the local settings. What actually happens?',
  options: [
    'Local scope wins and its whole entry is used; fields are never merged across scopes',
    'The project url and local command merge into one entry, because scopes layer like settings files',
    'Both definitions load, so Claude Code connects to two separate servers that are both named "db"',
    'Project scope wins because a committed file outranks a personal one',
  ],
  answerKey: 0,
  explanation:
    'When a server name is defined at more than one scope, Claude Code connects once using the highest-precedence source (local > project > user) and uses that whole entry without merging fields. Expecting the url and command to combine is the trap: scopes override wholesale, they do not merge like settings blocks.',
  misconceptionTag: 'mcp-scope-override-not-merge',
  sourceUrls: [MCP_CC],
});

export const regD2Q19 = defineQuestion({
  id: 'reg-d2-q19',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'mcp-tool-descriptions',
  taskStatement: '2.4',
  scenarioId: 'developer-productivity-tools',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'Your team ships a code-intelligence MCP server whose search tool understands symbols and references, but Claude Code keeps reaching for the built-in Grep instead. The server connects fine. What is the most effective fix?',
  options: [
    'Enrich the MCP tool description to say when it beats plain text search, so the agent picks it over Grep',
    'Deny the built-in Grep tool in permissions so the code-intelligence server becomes the only search available',
    'Move the server from project scope to user scope so it loads before the built-in tools are registered',
    'Raise MCP_TIMEOUT for the server so its search tool answers before the built-in Grep gets a chance',
  ],
  answerKey: 0,
  explanation:
    'The agent chooses tools from their descriptions, so making the MCP tool clearly advertise when it outperforms text search is what steers selection toward it. Changing the config scope does not affect selection, and hard-blocking Grep is a heavy, brittle workaround for what a better description solves directly.',
  misconceptionTag: 'mcp-vs-builtin-selection',
  sourceUrls: [MCP_CC, DEFINE],
});

export const regD2Q20 = defineQuestion({
  id: 'reg-d2-q20',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'mcp-resources',
  taskStatement: '2.4',
  scenarioId: 'developer-productivity-tools',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'Before writing a query, the agent burns several tool calls just to discover your database schema every session. Your MCP server could publish that schema once. Which MCP capability removes the discovery churn?',
  options: [
    'Expose the schema as an MCP resource that the user can @-mention so it is attached as context',
    'Add a describe_schema tool that the agent has to call at the start of every query it writes',
    'Embed the full schema in every tool error message so the agent learns it after the first failed call',
    'Give the server a larger timeout field in .mcp.json so the discovery calls have time to finish',
  ],
  answerKey: 0,
  explanation:
    'MCP resources expose content catalogs like schemas that Claude Code can pull in via @-mentions as attachments, cutting the exploratory tool calls the agent would otherwise make. Adding another discovery tool keeps the round trips, and stuffing the schema into error messages abuses a channel meant for recovery guidance.',
  misconceptionTag: 'mcp-resources-vs-tools',
  sourceUrls: [MCP_CC],
});

export const regD2Q21 = defineQuestion({
  id: 'reg-d2-q21',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'developer-productivity-tools',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'You want Claude Code to enumerate every test file in the repo by filename, matching **/*.test.ts, without reading their contents. Which built-in tool is designed for that?',
  options: [
    'Glob, which finds files whose names match a pattern',
    'Grep, which searches for a pattern inside file contents',
    'Read, which opens each candidate file to check it',
    'Edit, which locates files by matching a unique string',
  ],
  answerKey: 0,
  explanation:
    'Glob matches files by name pattern, including ** recursion, which is exactly a filename enumeration task. Grep is the tempting wrong pick: it searches the text inside files rather than matching filenames, so it answers a different question.',
  misconceptionTag: 'glob-vs-grep',
  sourceUrls: [TOOLS_REF],
});

export const regD2Q22 = defineQuestion({
  id: 'reg-d2-q22',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'developer-productivity-tools',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'An Edit call fails because its old_string, a common helper name, appears three times in the file. You must change only the second occurrence. What is the correct move?',
  options: [
    'Give Edit a longer old_string with enough surrounding context to pin down that one occurrence',
    'Set replace_all: true so Edit changes all three occurrences at once, then review the diff',
    'Switch to Write and rewrite the whole file, since Edit cannot target a repeated string',
    'Pass old_string as a regex anchored to the second match, since Edit uses ripgrep syntax',
  ],
  answerKey: 0,
  explanation:
    'Edit requires old_string to identify exactly one location, so extending it with surrounding context uniquely targets the intended occurrence. replace_all would change all three, and Edit does exact string replacement with no regex, so a pattern would not match at all.',
  misconceptionTag: 'edit-uniqueness',
  sourceUrls: [TOOLS_REF],
});

export const regD2Q23 = defineQuestion({
  id: 'reg-d2-q23',
  type: 'multi',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'developer-productivity-tools',
  difficulty: 2,
  estimatedSeconds: 30,
  selectCount: 2,
  stem: 'Which two statements correctly distinguish the Grep and Glob built-in tools? Select TWO.',
  options: [
    'Grep searches the contents of files for a pattern, finding matching lines',
    'Glob finds files by name pattern, not by what is inside them',
    'Glob searches file contents for a pattern while Grep matches files by their names',
    'Grep and Glob both modify matching files in place unless you pass a dry-run flag',
    'Neither tool supports recursive ** matching',
  ],
  answerKey: [0, 1],
  explanation:
    'Grep is a contents search that returns matching lines, while Glob matches files by name pattern; the two answer different questions. The reversed option swaps their roles, neither tool edits files, and Glob does support ** recursion, so those distractors are all false.',
  misconceptionTag: 'grep-vs-glob',
  sourceUrls: [TOOLS_REF],
});

export const regD2Q24 = defineQuestion({
  id: 'reg-d2-q24',
  type: 'multi',
  domain: 'd2',
  conceptId: 'mcp-config-scopes',
  taskStatement: '2.4',
  scenarioId: 'developer-productivity-tools',
  difficulty: 2,
  estimatedSeconds: 30,
  selectCount: 2,
  stem: 'Which two claims about configuring MCP servers in Claude Code are correct? Select TWO.',
  options: [
    'A project-scoped server lives in .mcp.json at the repo root and is shared via version control',
    'Config files support ${VAR} and ${VAR:-default} expansion to keep secrets and paths flexible',
    'Local-scoped servers are stored in the committed .mcp.json file under a "local" key, so they ship with the repo',
    'When a name is defined at several scopes, the entries are merged field by field',
    'User scope makes a server available to your whole team because it is stored in the shared project directory',
  ],
  answerKey: [0, 1],
  explanation:
    'Project scope uses a version-controlled .mcp.json, and Claude Code expands ${VAR} / ${VAR:-default} inside these configs. Local servers live in ~/.claude.json (not .mcp.json), multiple-scope definitions override wholesale rather than merge, and user scope stays private to you, so those three are wrong.',
  misconceptionTag: 'mcp-config-facts',
  sourceUrls: [MCP_CC],
});

// ==================================================================================================
// SCENARIO 4 — Code Generation with Claude Code (5): 2.5 built-in tools
// ==================================================================================================

export const regD2Q25 = defineQuestion({
  id: 'reg-d2-q25',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'code-generation-claude-code',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'Claude Code must fix a bug in an unfamiliar 400-file service without loading the whole repo into context. Which approach fits the built-in tools best?',
  options: [
    'Grep for the relevant entry points, then Read only those files to trace the path step by step',
    'Read every file in the service first so the model has complete context before it changes anything',
    'Glob the entire tree and paste the full file list into the plan as the map of the service',
    'Edit the likeliest files speculatively and run the tests to see which change makes them pass',
  ],
  answerKey: 0,
  explanation:
    'Incremental understanding, searching with Grep to find entry points and then Reading just those files to trace the path, keeps context small and targeted. Reading every file floods the context window with mostly irrelevant code, which is the anti-pattern this approach avoids.',
  misconceptionTag: 'incremental-codebase-understanding',
  sourceUrls: [TOOLS_REF, WRITING],
});

export const regD2Q26 = defineQuestion({
  id: 'reg-d2-q26',
  type: 'mc',
  variant: 'spot-bug',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'code-generation-claude-code',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'An automation passes old_string: "get(User|Account)ById" to the Edit tool expecting it to match either method name via regex. Edit reports no match even though both methods exist. Why?',
  options: [
    'Edit does exact string replacement with no regex or fuzzy matching, so it looks for that literal text',
    'Edit only matches at the start of a line, so the pattern needs a leading ^ anchor to reach the method names',
    'Edit needs the regex wrapped in slashes, like /get(User|Account)ById/, before it switches to pattern mode',
    'Edit matched but silently skipped the change because the file had not been read first',
  ],
  answerKey: 0,
  explanation:
    'The Edit tool replaces an exact old_string with a new_string and uses neither regex nor fuzzy matching, so a regex is treated as literal characters that do not appear in the file. The "wrap in slashes" and "line-anchored" options assume a pattern engine that Edit simply does not have.',
  misconceptionTag: 'edit-no-regex',
  sourceUrls: [TOOLS_REF],
});

export const regD2Q27 = defineQuestion({
  id: 'reg-d2-q27',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'code-generation-claude-code',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'A build step writes dist/bundle.js, which is listed in .gitignore. Claude Code must confirm the file exists by name. Which built-in tool reliably finds it, and why?',
  options: [
    'Glob, because it ignores .gitignore by default and so still lists the ignored file',
    'Grep, because it always includes gitignored files in its results unless told otherwise',
    'Read, because reading the file is the only way Claude Code can confirm a path exists',
    'Neither, because Claude Code cannot see any gitignored path with its built-in tools',
  ],
  answerKey: 0,
  explanation:
    'Glob finds files by name and does not honor .gitignore by default, so a gitignored build artifact still shows up. Grep is the trap here: it respects .gitignore and skips ignored files, so it would miss the artifact unless the path were passed directly.',
  misconceptionTag: 'glob-ignores-gitignore',
  sourceUrls: [TOOLS_REF],
});

export const regD2Q28 = defineQuestion({
  id: 'reg-d2-q28',
  type: 'multi',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'code-generation-claude-code',
  difficulty: 2,
  estimatedSeconds: 30,
  selectCount: 2,
  stem: 'Which two statements about the Edit tool are correct? Select TWO.',
  options: [
    'It performs exact string replacement of old_string with new_string',
    'old_string must match exactly once, or you supply more context or set replace_all',
    'It rewrites the entire file from new_string, the same way the Write tool does',
    'It matches old_string using ripgrep regular expression syntax, so metacharacters need escaping',
    'It never requires the file to have been read first, since it matches against the disk copy',
  ],
  answerKey: [0, 1],
  explanation:
    'Edit swaps an exact old_string for a new_string and needs that string to be unique, otherwise you add surrounding context or use replace_all. It does targeted edits rather than whole-file rewrites (that is Write), uses no regex, and normally requires the file to have been read, so the other options are false.',
  misconceptionTag: 'edit-tool-behavior',
  sourceUrls: [TOOLS_REF],
});

export const regD2Q29 = defineQuestion({
  id: 'reg-d2-q29',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'built-in-tools',
  taskStatement: '2.5',
  scenarioId: 'code-generation-claude-code',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'To change one constant, Claude Code needs to create a brand-new config file that does not exist yet, then later tweak a single line in it. Which tools fit each step?',
  options: [
    'Write to create the file, then Edit for the later single-line change',
    'Edit to create the file, then Write to swap in just the one changed line',
    'Write for both steps, rewriting the whole file again for the one-line change',
    'Read for both steps, since Read can create and modify files when given content',
  ],
  answerKey: 0,
  explanation:
    'Write creates or overwrites a file, which is right for a file that does not exist yet, and Edit is the tool for a later targeted single-line change. Using Edit to create a missing file is backwards, and rewriting the whole file with Write for a one-line change is the heavier, riskier option.',
  misconceptionTag: 'write-vs-edit',
  sourceUrls: [TOOLS_REF],
});

// ==================================================================================================
// SCENARIO 5 — Multi-Agent Research System (3): 2.2 structured errors + propagation
// ==================================================================================================

export const regD2Q30 = defineQuestion({
  id: 'reg-d2-q30',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'structured-tool-errors',
  taskStatement: '2.2',
  scenarioId: 'multi-agent-research-system',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'A research subagent hits a transient timeout on one of five sources it is querying. How should it handle the error before returning to the coordinator?',
  options: [
    'Retry the transient call itself, and escalate only errors it cannot resolve, along with partial results',
    'Propagate the timeout to the coordinator at once and suspend the other four queries until it responds',
    'Drop the failed source quietly and report the other four as the complete answer to the coordinator',
    'Abort the whole research task, since one failed source makes the remaining results unreliable',
  ],
  answerKey: 0,
  explanation:
    'Subagents should absorb transient failures themselves, retrying locally and only surfacing errors they cannot resolve, so a recoverable timeout does not become the coordinator\'s problem. Silently dropping the source is the trap because it reports incomplete coverage as if it were complete.',
  misconceptionTag: 'subagent-local-recovery',
  sourceUrls: [WRITING, HANDLE],
});

export const regD2Q31 = defineQuestion({
  id: 'reg-d2-q31',
  type: 'mc',
  variant: 'scenario',
  domain: 'd2',
  conceptId: 'structured-tool-errors',
  taskStatement: '2.2',
  scenarioId: 'multi-agent-research-system',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'A subagent\'s search tool returns a permission-denied failure for a restricted corpus, but formats it as an empty result set. The coordinator records "0 relevant sources found" and moves on. What is the design error?',
  options: [
    'An access failure arrived as an empty result, so the coordinator cannot tell "no data" from "no access"',
    'The subagent should have retried the permission-denied call until the restricted corpus responded',
    'The coordinator should treat every empty result set as an access failure and rerun the search elsewhere',
    'The search tool should have returned the raw permission stack trace so that the coordinator could inspect it',
  ],
  answerKey: 0,
  explanation:
    'A permission failure is not the same as a genuinely empty search, so encoding it as "0 results" hides a coverage gap the coordinator needs to know about; it should be a structured error instead. Retrying a permission denial will not fix authorization, and dumping a raw stack trace is opaque rather than actionable.',
  misconceptionTag: 'access-failure-vs-empty',
  sourceUrls: [HANDLE, WRITING],
});

export const regD2Q32 = defineQuestion({
  id: 'reg-d2-q32',
  type: 'multi',
  domain: 'd2',
  conceptId: 'structured-tool-errors',
  taskStatement: '2.2',
  scenarioId: 'multi-agent-research-system',
  difficulty: 2,
  estimatedSeconds: 30,
  selectCount: 2,
  stem: 'When a research tool returns an error the coordinator must act on, which two things should the error carry? Select TWO.',
  options: [
    'Whether the failure is retryable, so the coordinator knows whether to retry or route around it',
    'A human-readable description of what failed and what to try next',
    'A generic "Operation failed" string, since the coordinator only needs to know that something broke',
    'The opaque internal id of the failed request and nothing else, so no sensitive details can leak',
    'The full raw traceback with no interpretation, so the coordinator has every detail available',
  ],
  answerKey: [0, 1],
  explanation:
    'A retryable flag and a clear description of the failure and next step let the coordinator choose recovery deliberately instead of guessing. A generic string, a bare id, or a raw traceback are all opaque, giving the coordinator nothing actionable to decide on.',
  misconceptionTag: 'actionable-error-fields',
  sourceUrls: [HANDLE, WRITING],
});
