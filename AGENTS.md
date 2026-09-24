# Project instructions

Read this file completely before editing. Work only in this local project; never change the original hosted site.

Architecture: static React + TypeScript + Vite in app, with shared typing metrics in shared. Node.js 22 and pnpm are development/build tools only. GitHub Pages serves dist/. Keep deployment paths relative so repository subpaths work.

Non-negotiable behaviour:
- Preserve the fixed standard Dzongkha keyboard, both character layers, physical-key and Shift guidance, and green pressed-key feedback.
- Normalize Unicode consistently; render grapheme clusters without breaking Tibetan stacks. Remove only older completed words from the text window; retain unfinished and upcoming text. Generate text continuously.
- Keep beginner/intermediate/expert, comparable 60-second tests, WPM/accuracy/time, restart and device-local progress.
- Preserve the responsive design, Bhutan-default/Light/Dark themes and complete keyboard on laptop screens. Restore saved theme preferences.
- Keep passage content in app/data/dzongkha-texts.json as UTF-8. Keep sequential/random selection within the chosen level and persist the mode.
- Use vite-plugin-pwa as the single manifest/service-worker implementation. Keep all paths repository-relative and feedback POSTs uncached. Never claim installation until appinstalled or standalone mode confirms it.
- Preserve bundled Joyig font licensing and its offline availability.
- Store identity, progress and theme under dzongkha_typing_user_id, dzongkha_typing_progress and dzongkha_typing_theme. Retain at most 100 recent sessions and lifetime totals. Confirm resets; preserve identity and theme.
- Do not introduce authentication, accounts, a database, an application backend or score-upload APIs.
- Feedback goes directly to the optional public HTTPS import.meta.env.VITE_FEEDBACK_ENDPOINT. Send only the entered message, without credentials or progress. No secrets in VITE_ variables.
- Keep secrets, dependencies and generated output out of Git. Preserve unrelated files and ignored local data.

Verification: pnpm typecheck, pnpm test, pnpm build. See README.md and LOCAL_SETUP.md. There is no separate lint command.
