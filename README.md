# Dzongkha Typing Practice

A static React + TypeScript + Vite application for GitHub Pages. Practice opens directly with no account or application server. Node.js is used only for development, tests and building static files.

## Commands

Use Node.js 22 and pnpm 10.28.2. Install dependencies with pnpm so the committed pnpm-lock.yaml remains the source of truth.

- pnpm install --frozen-lockfile
- pnpm dev: Vite development server
- pnpm typecheck: TypeScript checking
- pnpm test: typing, progress and feedback tests
- pnpm build: static site in dist/
- pnpm preview: preview the static build

npm run dev, npm run typecheck, npm test and npm run build run the same scripts. No environment file is needed for typing practice.

## Device-local progress

The existing standard keyboard, both character layers, grapheme-aware highlighting, continuous text and 60-second Beginner/Intermediate/Expert tests are preserved.

- dzongkha_typing_user_id: anonymous device identity
- dzongkha_typing_progress: latest 100 sessions plus lifetime totals
- dzongkha_typing_theme: Bhutan (default), Light or Dark; saved choices are restored
- dzongkha_typing_text_mode: Sequential (default) or Random
- dzongkha_typing_font: Joyig (default) or Tsuyig
- dzongkha_typing_sound: key sounds on (default) or off
- dzongkha_typing_hands: finger guide hands shown (default) or hidden

## Finger guide

Every key on the on-screen keyboard is tinted by the finger that types it (app/finger-map.ts), with the home row strongest. Two semi-transparent hands (app/keyboard-hands.tsx) rest on the home row and Space; the finger for the next key reaches to it, and the finger that pressed a key flashes green when correct or red when wrong. The hands are measured from the rendered keys, so they fit every screen size, and Hide hands turns them off. Key sounds are synthesised in the browser (app/use-sound.ts), so they need no audio files and work offline.

Progress saves on completion, restart, new text, difficulty changes, page exit and backgrounding. Repeated lifecycle saves update the same attempt. No writes occur on each keypress. Tests Completed and best scores use completed 60-second tests; averages include labeled unfinished attempts. Reset requires confirmation and preserves identity, theme and difficulty.

Progress stays on this browser/device. Clearing browser storage removes it. If storage is blocked or full, the app shows a warning and typing still works. Browser lifecycle saves are best effort if a browser or device is forcibly terminated. The former server-backed leaderboard has been removed; no scores are uploaded.

## Feedback

Optionally copy .env.example to .env.local and set VITE_FEEDBACK_ENDPOINT before starting Vite or building.

### Google Forms (recommended)

1. Create a Google Form with one Paragraph question (for example "Feedback"). In Settings, turn off "Restrict to users in your organisation" and do not collect email addresses, so visitors can submit without signing in.
2. Open the form's ⋮ menu, choose Get pre-filled link, type any text into the question, choose Get link and copy it. It looks like https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.123456789=test.
3. Set VITE_FEEDBACK_ENDPOINT to that link (in .env.local, and as the repository's Actions variable for deployment).

The app posts only the message to that form's formResponse address as the entry field; responses appear in the form's Responses tab or its linked Sheet. Google Forms does not allow the page to read its reply, so the app confirms once Google has received the request.

### Other endpoints

Any other value must be a public HTTPS endpoint. The form reads import.meta.env.VITE_FEEDBACK_ENDPOINT and sends a JSON POST containing only { "message": "your feedback" }. It does not attach the anonymous ID, progress, cookies or a referrer. No endpoint means feedback submission is disabled with an explanatory message; practice still works.

The external endpoint must accept application/json, allow your site's origin through CORS, handle OPTIONS preflight and return a successful 2xx status on acceptance. It owns delivery, spam protection and storage. VITE_ variables are embedded in public JavaScript: never put secrets in them. Rebuild after changing the production endpoint.

## GitHub Pages

Build with pnpm build and publish the contents of dist/ as your Pages artifact. There is no server entry point to deploy. Vite uses relative asset URLs, and the manifest and service worker resolve within the deployment directory, supporting both root sites and repository paths. The service worker registers only in production.

Configure VITE_FEEDBACK_ENDPOINT in the build environment if feedback should be enabled. The external service must allow the deployed Pages origin. See LOCAL_SETUP.md for local usage.

The included .github/workflows/deploy.yml validates and deploys pushes to main. In the repository's Settings > Pages, choose GitHub Actions as the build source. If needed, set VITE_FEEDBACK_ENDPOINT as a repository Actions variable; its value is public. Both local and Actions builds use relative deployment paths.

Before the first push, review `git status --short` and `git diff --cached` after staging. Commit source files, pnpm-lock.yaml, bundled assets and their licenses. The .gitignore excludes local work/, dependencies, build output and environment files except .env.example. Upload through Git rather than dragging the whole local folder into GitHub, since manual uploads do not apply .gitignore.

## Browser checks

Start Vite on port 5173 and a disposable Chrome profile with remote debugging on port 9223, then run node scripts/browser-check.mjs. Optionally set BROWSER_TEST_URL to a static preview URL, including a repository subpath. The script clears storage only in that disposable browser profile.

Do not commit dependencies, generated builds, browser profiles or secrets. Existing local data under ignored work/ is left untouched.

## Editing Dzongkha text

All seven original passages are preserved in app/data/dzongkha-texts.json. Edit the beginner, intermediate or expert array, adding an object with a unique id and a nonempty text string. Save as UTF-8. For example, copy an existing object, change its id to beginner-004 and replace its text with your passage. Use JSON double quotes and commas between entries; do not add a trailing comma. Keep at least one passage per level. Preserve Tibetan word separators and characters supported by the standard keyboard. The existing typing test checks keyboard coverage. Content is imported at build time, validated and normalized to NFC for scoring; rebuild to publish edits.

The small Text selector offers Sequential (default) and Random and saves under dzongkha_typing_text_mode. Sequential starts at the first passage and cycles in JSON order; Random selects within the chosen level and excludes the previous selection when alternatives exist. Each completed test queues the next selection; its results stay visible until Restart/Tab starts that next test. Restart during an unfinished test repeats its starting passage. New text advances immediately. Text continues appending passages from the selected level as needed during the 60-second test.

Joyig is enabled for Dzongkha text and keyboard glyphs using the bundled ThinWangT Joyig font. Its source and SIL Open Font License are in public/fonts/. The keyboard mapping and Unicode remain unchanged; font files load locally and are available offline.

The Font selector changes Dzongkha typography immediately without resetting the test. English controls retain the UI font. No Tsuyig/Tshugyig, DDC Uchen or Jomolhari asset is bundled: Tsuyig uses installed Tibetan Unicode fonts, with bundled Joyig as a final offline fallback. A distinct Tsuyig appearance therefore depends on an installed font until a licensed Tsuyig asset is supplied. See public/fonts/README.md for the exact fallback order.

## Installing the PWA

vite-plugin-pwa generates the sole manifest, service worker and registration script. Do not add a separate public/sw.js or manifest. Icons are PNG conversions of the existing Dzongkha logo: 192px, 512px, a 512px maskable variant with safe padding, and a 180px Apple touch icon.

Run pnpm build, then pnpm preview --host 127.0.0.1. Open the printed URL in Chrome or Edge. Wait for the page to load and the service worker to activate. Install becomes enabled only when the browser supplies beforeinstallprompt. Click it and confirm the browser's own dialog. Only appinstalled or standalone mode marks the app installed. A dismissed prompt is cleared until the browser offers another one. Browser policies, existing installation and engagement rules can affect whether a prompt is offered. In iOS Safari, choosing Install shows Share > Add to Home Screen instructions.

Production hosting requires HTTPS (localhost is allowed for testing). Development mode does not register a new service worker. To test a GitHub Pages repository path locally, run pnpm preview --host 127.0.0.1 --base=/dzongkha-typing/ and use the printed subpath URL. Relative manifest start/scope, icons, registration and generated assets support repository deployment. No fixed repository name is built in. App identity defaults to the resolved start URL to keep different repository apps distinct.

The app shell, JS/CSS, bundled passages, icons and Joyig font are precached. Revisit once online before trying offline mode. Feedback POSTs are neither cached nor queued. New service-worker versions wait until old app tabs are closed, so an update does not interrupt typing.

With a disposable Chrome debug profile on port 9223 and production preview running, node scripts/pwa-check.mjs checks manifest/icons, scope, font, offline loading and installation eligibility. It simulates userChoice/appinstalled, standalone and Safari states; creating an OS shortcut and launching that installed shortcut must also be checked manually in a normal browser. scripts/browser-check.mjs covers themes, JSON levels, sequential/random mode, progress and responsive typing.
