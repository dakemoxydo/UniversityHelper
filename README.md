# University Helper

University Helper is a web navigator for applicants. It compares university study profiles using factual admission data entered for each profile: budget and paid seats, passing score, average score, maximum score, tuition, commute time, dormitory, and military training center.

## What it does

- Stores universities and study profiles in PostgreSQL through Drizzle ORM.
- Supports simple login/password accounts, with universities and applicant profile data saved per user.
- Falls back to browser local storage when `DATABASE_URL` is not configured, so the calculator is still usable in demo mode.
- Keeps the applicant profile from individual exam subjects and scores, with at least three subjects.
- Does not calculate admission chances from the applicant score.
- Lets each study profile be configured as budget only, paid only, or both.
- Lets each profile be linked to a direction, for example `01.03.05 Статистика`.
- Supports adding, editing, and deleting universities with their profiles.
- Compares budget and paid admission data separately.
- Calculates a relative 0-100 match score by comparing all entered profiles with each other.
- Lets the applicant reorder comparison priorities and disable commute or dormitory when they are not important.

## Profile data

Each university can contain multiple study profiles. A profile stores:

- profile name, for example `Бизнес Аналитика`;
- direction, for example `01.03.05 Статистика`;
- admission mode: budget only, paid only, or both;
- number of places;
- passing score;
- average score;
- maximum score.

Paid admission can also store annual tuition cost.

## Scoring model

The app uses relative comparison. When a university or profile is added, edited, or removed, the ranking can change because seats, scores, tuition, commute time, dormitory, and military training center are normalized against the current set of options.

Current comparison parameters:

- Budget seats.
- Paid seats.
- Budget admission scores.
- Paid admission scores.
- Annual tuition.
- Commute time.
- Dormitory.
- Military training center.

The applicant can move these parameters up or down. Higher parameters influence the final score more strongly. Commute and dormitory can be disabled entirely. Applicant exam scores are shown for reference, but they do not change the ranking.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Persistent accounts require PostgreSQL. Without `DATABASE_URL`, the app cannot sign users in and the planner falls back to local browser drafts only after API storage fails. To use PostgreSQL, set `DATABASE_URL` and run:

```bash
npm run db:migrate
npm run dev
```

## Windows quick start

Double-click `start.bat` from the project folder. It checks Node.js, installs dependencies on the first launch, creates `.env.local` from `.env.example` when needed, opens http://localhost:3000, and starts the Next.js development server.

## Scripts

- `npm run dev` starts the local Next.js server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript checks.
- `npm run db:generate` creates Drizzle migration files from the schema.
- `npm run db:migrate` applies committed Drizzle migrations to PostgreSQL.
- `npm run db:push` syncs the Drizzle schema with PostgreSQL for quick local experiments.

## Deployment

For public hosting with accounts and shared access, use Vercel with a hosted PostgreSQL database. See [DEPLOYMENT.md](DEPLOYMENT.md).
