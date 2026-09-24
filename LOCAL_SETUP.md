# Local setup

1. Install Node.js 22 and pnpm 10.28.2.
2. Run pnpm install --frozen-lockfile.
3. Run pnpm dev (or npm run dev).
4. Open the localhost URL printed by Vite, normally http://localhost:5173.

No environment variables or external services are needed for typing and progress. If pnpm is not on PATH, use corepack pnpm in place of pnpm.

For feedback, optionally copy .env.example to .env.local and set VITE_FEEDBACK_ENDPOINT to your public HTTPS feedback endpoint, then restart Vite. See README.md for its JSON and CORS contract.

Validate with pnpm typecheck, pnpm test and pnpm build. Preview the static build with pnpm preview (normally http://localhost:4173). npm run build and npm run preview are equivalent.

Deploy only the contents of dist/ to GitHub Pages. No application server runs in production.

For production installation testing, run pnpm build then pnpm preview --host 127.0.0.1. Open the printed URL in Chrome or Edge and use Install when enabled. Accept the browser dialog and launch the new app shortcut to confirm standalone mode. Test offline after the first successful online load. On iOS Safari, use the Install button for Share > Add to Home Screen instructions. See README.md for repository-subpath testing and editing JSON passages.
