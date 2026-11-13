# COACH FOUAD — Online Coaching Platform

A complete online fitness coaching platform: the coach manages clients, nutrition plans,
workout programs and files; each client gets a private, mobile-first dashboard.

## Stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Framework  | Next.js 15 (App Router, Server Actions)                           |
| Language   | TypeScript (strict)                                               |
| Styling    | Tailwind CSS — black / dark grey palette with a warm beige accent |
| Database   | SQLite via `better-sqlite3` (WAL mode, foreign keys enforced)     |
| Auth       | Email + password (bcrypt), opaque session tokens in httpOnly cookies |
| Files      | Local disk (`storage/uploads`) served through an authorised route |
| Icons      | lucide-react                                                      |

> **Note on Supabase:** the brief asked for Supabase. No Supabase project or keys were
> available, so the same feature set is implemented against a server-side SQLite database
> with an isolated data layer (`src/lib/data.ts`, `src/lib/db.ts`). Moving to Supabase
> Postgres means porting those queries plus the schema in `src/lib/db.ts`; the UI, actions
> and authorisation rules stay unchanged.

## Quick start

```bash
npm install
npm run seed     # creates storage/coach-fouad.db with the coach + demo data
npm run dev      # http://localhost:3100
```

The database is also created automatically on first use if it does not exist.

### Demo accounts

| Role   | Email                   | Password            |
| ------ | ----------------------- | ------------------- |
| Coach  | `admin@coachfouad.com`  | `CoachFouad2026!`   |
| Client | `client@coachfouad.com` | `ClientDemo2026!`   |

Seeded demo content: 4 clients (active / pending / suspended), 2 nutrition templates,
2 workout templates, plan copies assigned to the demo client, 2 announcements and 3
notifications. Change the coach credentials with `ADMIN_EMAIL` / `ADMIN_PASSWORD` before
the first start, and reseed with `npm run seed -- --reset`.

## Features

**Authentication**
- Login, client self-registration, forgot-password + reset-link flow, logout.
- bcrypt password hashing, httpOnly + SameSite cookies, 30-day server-side sessions,
  login rate limiting, password changes revoke sessions on other devices.
- Server-side route guards in every layout — no client-side-only protection.

**Coach (admin)**
- Overview: totals, active/pending/inactive counts, new registrations, recent activity.
- Clients: search by name/email, filter by status, full profile view, edit details, coach
  notes, profile photo, activate / deactivate / suspend, delete, password resets handled by
  the client flow.
- Plans: create/edit nutrition templates (macros + meals + foods) and workout templates
  (days + exercises with sets, reps, rest, video link, instructions, notes).
- Assignment: pick a client → a **deep copy** of the template is created and assigned, so
  later template edits never alter a client's live plan. Full assignment history is kept.
- Files: multi-file upload (PDF, JPG, PNG, WEBP, MP4, DOC/XLS/PPT, TXT, CSV — 50 MB each),
  rename, re-categorise, describe, replace the binary, delete, and assign to one or many
  clients.
- Announcements: publish (notifies every active client) or save as draft, toggle, delete.

**Client**
- Personalised dashboard: greeting, goal, calorie/protein targets, training days, alert
  count, current plans, recent files, notifications and announcements.
- Nutrition: calorie + macro targets, coach notes, meals with foods and quantities,
  print-optimised PDF export of the whole plan.
- Workouts: split, days, exercises, sets/reps/rest, demo links, instructions and coach notes.
- Files: only the files assigned to that client, grouped by category.
- Profile: edit details, upload a photo, change password.
- Account status gate: pending / inactive / suspended clients see a status screen instead of
  the dashboard.

## Security model

- Every Server Action starts with `requireAdmin()` or `requireClient()` — the role is read
  from the session, never from form input.
- Clients are resolved from the session; no action accepts a client id from the browser.
- Files are served by `/api/files/[fileId]`, which checks the session and verifies the file
  is assigned to that client (`403` otherwise). Stored filenames are server-generated UUIDs
  and paths are `basename`-sanitised against traversal.
- Avatars are served by `/api/avatar/[userId]`, restricted to the owner or the coach.
- Passwords, sessions and reset tokens are never exposed to the client bundle; `.env*` and
  the database file are git-ignored.

## Scripts

| Command             | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Dev server on port 3100                          |
| `npm run build`     | Production build                                 |
| `npm start`         | Serve the production build on port 3100          |
| `npm run seed`      | Create/verify the database and demo data         |
| `npm run seed -- --reset` | Delete the database and reseed from scratch |
| `npm run typecheck` | `tsc --noEmit`                                   |

## Configuration

Copy `.env.example` to `.env.local`:

| Variable         | Required | Purpose                                                        |
| ---------------- | -------- | -------------------------------------------------------------- |
| `APP_URL`        | prod     | Base URL used in password-reset links                          |
| `ADMIN_EMAIL`    | no       | Coach account email for the first seed                         |
| `ADMIN_PASSWORD` | no       | Coach password for the first seed                              |
| `DATABASE_PATH`  | no       | Absolute path to the SQLite file                               |
| `RESEND_API_KEY` | no       | Sends reset emails through Resend; without it links are logged |
| `MAIL_FROM`      | no       | From address for reset emails                                  |

## Deployment

The app is a standard Node server; nothing is tied to a specific host.

```bash
npm ci
npm run build
npm start          # PORT=3100 by default, override with `next start -p $PORT`
```

- Point `DATABASE_PATH` at **persistent** storage and back up that file (it holds everything).
- Back up `storage/uploads` (user files).
- Run behind HTTPS (cookies are `secure` in production) and set `APP_URL` to the public origin.
- On a VPS, run `npm start` under systemd/pm2 and reverse-proxy with Nginx/Caddy.
  Serverless hosts with an ephemeral filesystem are not suitable without replacing the
  SQLite and disk-storage adapters.

## Project structure

```
src/
  app/
    (auth)/            login, register, forgot-password, reset-password
    admin/             coach dashboard, clients, nutrition, workouts, files, announcements
    dashboard/         client dashboard, nutrition, workouts, files, profile
    print/nutrition/   print/PDF nutrition plan
    api/files|avatar/  authorised file streaming
    actions/           auth, admin and client Server Actions
  components/          UI kit, shells, forms
  lib/                 db + schema, auth, data access, types, mail
scripts/seed.ts        seeding / reset
storage/               SQLite database + uploads (git-ignored)
```

## Known limits

- Password-reset emails need `RESEND_API_KEY`; without it the link is written to the server
  console and shown on screen in development only.
- Nutrition PDF export uses the browser print dialog (Save as PDF) on a dedicated
  print-optimised page rather than a server-side PDF renderer.
- Clients cannot change their own email address; the coach can from the client profile.
