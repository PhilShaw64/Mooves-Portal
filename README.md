# Mooves Portal

Client-facing sale tracking portal for Northwood UK. Built with React + Vite, deployed on Cloudflare Pages, backed by the same Supabase project as Mooves.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill in your values:
```
VITE_SUPABASE_URL=https://tqspuxqjavhhqmhmbaen.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```
The anon key is the same one used in Mooves (SUPABASE_KEY in App.jsx).

### 3. Run locally
```bash
npm run dev
```

### 4. Deploy to Cloudflare Pages
- Connect this repo to a new Cloudflare Pages project
- Build command: `npm run build`
- Build output directory: `dist`
- Add environment variables in Cloudflare Pages settings:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 5. Update PORTAL_BASE_URL secret in Supabase
Once deployed, update the `PORTAL_BASE_URL` secret in Supabase Edge Functions secrets to your live Cloudflare Pages URL (e.g. `https://portal.mooves.co.uk`).

## Architecture

- `/invite?token=xxx` — client lands here from invite email
- Token validated against `portal_invites` Supabase table
- Client sets a password → Supabase auth account created
- Dashboard loads case data from `cases` table using `case_id` stored in user metadata
- RLS on `cases` table should be configured so clients can only read their own case (see Supabase setup)

## Supabase RLS (important)

Add this policy to the `cases` table so portal clients can only read their own case:

```sql
create policy "Portal clients can view their own case"
on cases for select
using (
  auth.uid() is not null
  and id = (auth.jwt() -> 'user_metadata' ->> 'case_id')
);
```
