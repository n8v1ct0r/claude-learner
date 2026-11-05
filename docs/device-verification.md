# Device Verification — GC-14 (manual criterion)

Only a human completing these checklists may flip `evals/manual/GC-14.status` to green.
Format of that file: `green <note>` on one line.

## Gate D — first device install (after M3, ~30 min)

Prereqs: iPhone + USB cable + Mac with Xcode; free Apple ID is enough.

- [ ] iPhone: Settings → Privacy & Security → Developer Mode → on (reboots the phone)
- [ ] Xcode → Settings → Accounts → add your Apple ID (Personal Team)
- [ ] Connect iPhone via USB, trust the computer
- [ ] Repo root: `npx expo run:ios --device` — select your iPhone; first build signs with the
      Personal Team (if signing fails, open `ios/ClaudeLearners.xcworkspace` in Xcode → select the
      `ClaudeLearners` scheme → Signing & Capabilities → select your Personal Team, then re-run)
- [ ] iPhone: Settings → General → VPN & Device Management → trust the developer certificate
- [ ] Confirm the installed app is Claude Learner (`com.cyrilvictor.claudelearner`) and its URL
      scheme is `claudelearner://`
- [ ] Launch Claude Learner, complete ONE full pilot lesson on the phone (all exercise types render,
      haptics fire, ceremony plays)
- [ ] Confirm the warm-dark theme feels right in person (decision D17 check-in)
- [ ] Note: free-provisioning profiles expire every 7 days — re-run `npx expo run:ios --device`
      weekly, or buy the $99/yr Apple Developer Program to stop re-signing (also unlocks TestFlight)

## Gate C — full device checklist (after M11, ~30 min)

Run top to bottom on a real iPhone. Reset onboarding first (delete + reinstall the app, or clear
its storage) so the first-run check exercises a genuine cold install.

### First run & onboarding
- [ ] First launch → onboarding appears BEFORE the Path tab: pick an exam date (or "Just exploring"),
      pick a daily goal → lands STRAIGHT in the first lesson (no placement quiz, no signup wall)
- [ ] Resumability: on the daily-goal step, kill the app, reopen → onboarding resumes on daily-goal
      (not back at the start), and "Skip for now" also reaches the first lesson without blocking
- [ ] Returning launch: fully complete onboarding once, then cold-open again → goes straight to the
      Path/Continue home, onboarding does NOT show again

### Juice & toggles
- [ ] Haptics toggle (Profile): off silences the correct-answer tap, button-press taps, and the
      ceremony/streak celebration haptics; on restores
- [ ] Sound toggle (Profile): off silences the correct/incorrect answer cues, the combo-flare cue, and
      the ceremony/streak SFX; on restores
- [ ] Answer cues: a correct answer plays the correct cue + a light tap; a wrong answer plays only the
      gentle (non-buzzer) cue with NO haptic; a 5-in-a-row plays the combo cue
- [ ] Streak milestone: complete a lesson that lands the streak on a milestone (e.g. day 3/7) → after the
      ceremony's "Done", a full-screen gain-framed streak takeover appears, then "Keep it going" returns
      to the path
- [ ] Reduce Motion on (iOS Settings): ceremonies degrade to fades, no confetti, path node stops pulsing;
      answer/ceremony sound + haptics still fire (audio/haptics are NOT gated by reduce motion)
- [ ] Quest + chest surfaces: complete a lesson → ceremony chest reveals; Profile quests advance and a
      completed quest's chest claims itself; bonus-chest / commitment card behaves

### Feynman loop & grading degraded mode
- [ ] Typed explain-back: enter an explanation with the keyboard, submit it, and verify online
      grading returns a score without any microphone or speech-recognition prompt
- [ ] Feynman loop online: gap card → refine → second grading works on-device
- [ ] Degraded mode: airplane mode ON → explain-back falls back to SILENT self-assessment (no error
      surfaced, learner rates their own coverage, ceremony still awards the lesson)

### Notifications
- [ ] Post-first-lesson priming: the reminder explainer appears in the ceremony ONLY after the first
      completed lesson (not before); "Not now" is honored and does not re-nag
- [ ] Local notifications: enable reminders, background the app, verify delivery; verify quiet-hours
      suppression and that reminders pause after five quiet days

### Offline, sync & account
- [ ] Offline: airplane mode → complete a full lesson + SRS review → reconnect → verify XP syncs
      (no duplicates in Supabase xp_events)
- [ ] Sync: progress visible in hosted Supabase dashboard after reconnect
- [ ] Save-progress prompt: after a first streak, the account/email upgrade surface (Profile) offers to
      save the profile; adding an email keeps the same anonymous profile + progress

### Accessibility & exams
- [ ] Largest AX text: set iPhone to LARGEST accessibility text size (Settings → Accessibility →
      Display & Text Size) → onboarding, one full lesson, and one mock-exam screen show no clipped or
      truncated text and everything stays reachable
- [ ] Mock exam mute: start a sim-mode mock → SFX are muted for exam realism; reduce-time-pressure
      parity holds (timed rounds convert to untimed with identical XP)
- [ ] Mock exam resume: start a sim-mode mock, kill the app mid-exam, reopen → resumes at the same
      question with timer state intact

When all boxes are checked, write `evals/manual/GC-14.status`:
`green Gate D + Gate C completed <date> on <device model>`
