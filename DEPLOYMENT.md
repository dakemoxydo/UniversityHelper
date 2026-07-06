# Deployment: Vercel + PostgreSQL

This app needs a hosted PostgreSQL database because login, sessions, profiles, universities, and specialties are stored server-side.

## 1. Create a PostgreSQL database

Recommended quick option: Neon.

1. Create a Neon project.
2. Copy the pooled or standard PostgreSQL connection string.
3. Make sure the connection string includes SSL for production, for example:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Supabase or another hosted PostgreSQL provider works too, as long as it gives a normal PostgreSQL URL.

## 2. Push this project to GitHub

Vercel deploys easiest from a GitHub repository.

```bash
git add .
git commit -m "Prepare deployment"
git push
```

## 3. Import the project in Vercel

1. Open Vercel and choose Add New Project.
2. Import the GitHub repository.
3. Framework preset should be Next.js.
4. Build command can stay `npm run build`.
5. Add this environment variable in Project Settings -> Environment Variables:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Add it for Production, Preview, and Development if you want all Vercel environments to use the same database.

## 4. Apply database migrations

Before people register or log in, apply the Drizzle migrations to the hosted database.

Locally, put the hosted database URL into `.env.local`, then run:

```bash
npm run db:migrate
```

Do not commit `.env.local`; it is intentionally ignored by Git.

## 5. Deploy

After Vercel finishes the first deployment, open the generated `https://...vercel.app` URL.

If registration fails, check these first:

- `DATABASE_URL` exists in Vercel environment variables.
- The hosted database is reachable and allows SSL connections.
- `npm run db:migrate` was run against the hosted database.
- The Vercel deployment was redeployed after adding environment variables.