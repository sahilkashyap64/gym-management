# Crosstrain Gym Management

Next.js admin dashboard for gym operations: members, memberships, billing, payments, attendance, classes, leads, staff, PT packages, reports, and diet/workout plans.

The app uses:

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Prisma 6
- PostgreSQL
- Signed HTTP-only cookie login

## Requirements

- Node.js compatible with the installed Next/ESLint versions. Node 20 LTS or Node 22 LTS is recommended.
- npm
- PostgreSQL database URL

## Environment

Create `.env` from the example:

```bash
cp .env.example .env
```

Update these values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
ADMIN_EMAIL="crosstrainfc@gmail.com"
ADMIN_PASSWORD="change-this-password"
AUTH_SECRET="replace-with-a-long-random-secret"
```

Notes:

- `.env` is ignored by git.
- `AUTH_SECRET` should be a long random string in production.
- The local fallback login is `crosstrainfc@gmail.com / admin123`, but production should use explicit `.env` values.

## Install

```bash
npm install
npm run prisma:generate
```

## Database Setup

Apply the Prisma schema:

```bash
npm run prisma:migrate -- --name init
```

Seed demo data:

```bash
npm run prisma:seed
```

The seed adds demo branches, users, staff, members, plans, memberships, invoices, payments, bookings, attendance, leads, diet plans, and PT packages.

Demo login:

```text
crosstrainfc@gmail.com / admin123
```

Open Prisma Studio if you want to inspect or edit database rows:

```bash
npm run prisma:studio
```

## Development

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Unauthenticated users are redirected to `/login`. The dashboard currently still reads the UI snapshot from `lib/gym-data.ts`; the Prisma schema and seed are ready for wiring persistent CRUD into the UI.

## Scripts

```bash
npm run dev              # Start local Next dev server
npm run build            # Production build
npm run start            # Start production server after build
npm run lint             # ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Create/apply local migration
npm run prisma:seed      # Load demo data
npm run prisma:studio    # Open Prisma Studio
```

## Authentication

Login is implemented with:

- `app/login/page.tsx`
- `app/api/login/route.ts`
- `app/api/logout/route.ts`
- `proxy.ts`
- `lib/auth.ts`

The session is stored in a signed HTTP-only cookie. The proxy verifies the cookie signature and expiry before allowing access to dashboard pages.

For production:

- Set `ADMIN_EMAIL`.
- Set a strong `ADMIN_PASSWORD`.
- Set a strong `AUTH_SECRET`.
- Serve over HTTPS so secure cookies are used.

## Data Model

Main Prisma models:

- `User` and `Session`
- `Branch`
- `Member`
- `MembershipPlan`
- `MemberMembership`
- `Staff`
- `ClassSlot` and `Booking`
- `Attendance`
- `Invoice` and `Payment`
- `Lead`
- `DietPlan`
- `PtPackage`

Schema file:

```text
prisma/schema.prisma
```

Seed file:

```text
prisma/seed.ts
```

## Deployment

This app now needs a server runtime for login, logout, proxy auth, and future Prisma-backed routes. Use a platform that supports Next.js server routes, such as Vercel, Render, Railway, or a Node server.

Build and start:

```bash
npm run build
npm run start
```

Static export is still available only for a non-authenticated static preview:

```bash
STATIC_EXPORT=true npm run build
```

Do not use static export for the full app with login and database functionality.

## Verification

Useful checks before pushing:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run prisma:generate
```
