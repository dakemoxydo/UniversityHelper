# University Helper

University Helper is a web calculator for applicants. It turns subjective trade-offs like commute time, tuition cost, admission chances, dormitory availability, and personal interest into a ranked list of university programs.

## What it does

- Stores universities and programs in PostgreSQL through Drizzle ORM.
- Falls back to browser local storage when `DATABASE_URL` is not configured, so the calculator is still usable in demo mode.
- Calculates a 0-100 score with a weighted sum model.
- Builds the applicant profile from individual exam subjects and scores, with at least three subjects.
- Lets the applicant tune criteria weights through a short preference survey, presets, or manual settings.
- Explains each recommendation with strengths and risks.

## Scoring criteria

The current model uses five criteria:

- Admission chance: exam score, individual achievement points, passing score, and olympiad benefits.
- Interest and career fit: applicant interest and career outlook on a 1-5 scale.
- Logistics: commute time to campus.
- Finance: tuition cost and budget seats.
- Support: dormitory and military training center availability.

Important: "100 points for an olympiad subject" is approximated as a bonus to the aggregate exam score because the app currently stores only the total exam score, not individual subject scores.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Without `DATABASE_URL`, the app runs in local browser mode. To use PostgreSQL, set `DATABASE_URL` and run:

```bash
npm run db:push
npm run dev
```

## Windows quick start

Double-click `start.bat` from the project folder. It checks Node.js, installs dependencies on the first launch, creates `.env.local` from `.env.example` when needed, opens http://localhost:3000, and starts the Next.js development server.

## Scripts

- `npm run dev` starts the local Next.js server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript checks.
- `npm run db:push` syncs the Drizzle schema with PostgreSQL.
