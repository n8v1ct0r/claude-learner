# App Store listing: Claude Learners 1.0

Draft copy and answers for App Store Connect. Character limits are Apple's; counts are checked by
`node scripts/listing-check.mjs`. Every number below comes from `npm run content:validate` /
`npm run content:stats` on the shipping content (649 questions, 58 lessons, 8 exams).

## Identity

| Field | Value |
|---|---|
| App name (30) | Claude Learners |
| Bundle ID | com.cyrilvictor.claudelearner |
| SKU | claude-learners-ios |
| Primary category | Education |
| Secondary category | Reference |
| Price | Free |
| Availability | All regions where Education apps are allowed |

## Subtitle (30)

Study for the CCA-F exam

## Promotional text (170)

649 original practice questions, weighted like the public exam guide. Short lessons, spaced review and full mock exams. Works offline. No account needed.

## Description (4000)

Claude Learners helps you prepare for the Claude Certified Architect – Foundations exam in short daily sessions.

Independent project. Not affiliated with Anthropic.

WHAT'S INSIDE
• 58 bite-size lessons across the 5 exam domains, each designed to take under 5 minutes
• 649 original practice questions, weighted like the domains in the public exam guide
• 3 full mock exams (60 questions, 120 minutes) and 5 domain mini exams
• A report after every exam: score by domain, the tasks you missed, and what to study next

HOW IT HELPS YOU LEARN
• Spaced review brings back the questions you missed, on a schedule that helps them stick
• Explain it back: put each idea in your own words, then check yourself against the key points
• Every answer comes with a short explanation and a link to the public documentation it is based on
• Daily streaks and gentle reminders, with quiet hours, to keep a steady pace

PRIVATE BY DESIGN
• No account, no ads, no tracking
• Your progress stays on your iPhone
• Works offline (opening a source link needs a connection)

All questions are original and written from public documentation and the public exam guide. They are not real exam questions.

## Keywords (100)

certification,exam prep,AI architect,agents,MCP,prompt engineering,study,quiz,spaced repetition

## URLs

| Field | Value |
|---|---|
| Support URL | https://github.com/n8v1ct0r/claude-learner-app/issues |
| Marketing URL | https://github.com/n8v1ct0r/claude-learner-app |
| Privacy policy URL | https://github.com/n8v1ct0r/claude-learner-app/blob/main/docs/privacy.md |

These resolve once the repository is public.

## App Privacy (the "nutrition label")

Data collection: **Data Not Collected**. The v1.0 build has no accounts, analytics, advertising or
tracking, and progress is stored only on the device (see docs/privacy.md).

## Age rating questionnaire

Answer "None" to every content category. Recommended answer for "Unrestricted Web Access": **No**.
The app opens only the specific documentation pages each question cites, in the system in-app
browser (SFSafariViewController); it has no address bar or general browsing.

## Export compliance

The app uses no encryption beyond Apple's HTTPS stack. `ITSAppUsesNonExemptEncryption` is `false` in
the build, so App Store Connect does not ask for documentation.

## App Review notes

Claude Learners is an independent study app for the Claude Certified Architect – Foundations exam.
It is not affiliated with or endorsed by Anthropic. It needs no login: everything runs on the
device. To see the core loop: finish the two onboarding steps (or tap Skip), complete the first
lesson, then open the Exams tab and start a mini exam. Reminders are local notifications; the app
asks for permission only when you tap "Enable reminders".

## Screenshots

Required: 6.9-inch iPhone (1320 x 2868 or 1290 x 2796). Not captured yet: they come from the Release
build in the Simulator after the new visual design lands.
