# Run the grounded assistant version

Use branch `codex/grounded-product-assistant` and the exact commit in the submission manifest. Do not merge another student's competing implementation into this version merely to run it.

Follow the root README for a new local installation. Existing installations need PostgreSQL running, dependencies installed from the lockfile, and Prisma Client generated. Do not reseed an existing database: seeding deletes orders and replaces products.

From project root:

```powershell
npm.cmd ci
npm.cmd run db:generate
```

Create your own ignored environment files from the example templates if they do not exist. Do not overwrite existing local configuration. Configure your own PostgreSQL database and frontend URL as described in the root README. Add only to backend/.env:

```env
GEMINI_API_KEY=YOUR_OWN_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
```

Never use VITE_ for the provider key. The root source, browser bundle, API responses and screenshot evidence must not contain the private value. The model is configurable; account eligibility and quota determine access.

```powershell
npm.cmd run dev
```

Open http://localhost:5173/assistant. Ask which keyboard is below PHP2000. Check the visible source against its detail page. Ask for a refrigerator for no match. Missing/unavailable credentials or provider failure produce a clearly labeled catalog fallback; no-match does not call the provider. The application uses a 10-second provider deadline without automatic retries.

```powershell
npm.cmd run check
```

See design-note.pdf for the one-page design, test-record.md for the six required demonstrations, contribution.md for individual work, and evidence/ for real page captures. No Google Search tools, private records, order actions or stock-changing assistant actions are enabled.
