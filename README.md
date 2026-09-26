# RM-FS

AI-driven risk diagnosis, GAP Index analysis, and autonomous mitigation-task SaaS.

## Stack

Next.js 15 App Router · Prisma · SQLite (local) / PostgreSQL (prod) · Zod · TanStack Query · Recharts

## Run locally

```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Open `/assess/demo`（部署は自由入力、全70問・制限10分）, `/dashboard/demo`, `/tasks?projectId=demo`, `/settings/departments`.

採点は「設問重要度（1-5）」で領域内加重平均し、7領域ウェイトで総合点を出します。


Chinese Wall viewer role: `/dashboard/demo?role=CLIENT_ADMIN` vs `SYSTEM_ADMIN`.
