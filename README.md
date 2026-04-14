# CAS program viewer

Next.js app for publishing **CAS Excel exports** (`.xlsx`) to a **read-only public page** with program search, a default program, and admin-controlled **summary columns**. Intended for data that may be fully public (no per-viewer login).

Remote repo: [github.com/gcrouch-wsu/CAS](https://github.com/gcrouch-wsu/CAS).

> **Note:** The local folder created by `create-next-app` is `cas` (npm package naming). Clone the GitHub repo as `CAS` or any name you prefer; point Vercel at that directory.

## Requirements

- Node 20+
- Postgres database
- Environment variables (see `.env.example`)

## Database

Run the migration SQL against your database (once):

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_cas_publications.sql
```

Or paste the file contents into the SQL editor in Neon / Supabase / Vercel Postgres.

## Local development

```bash
cp .env.example .env.local
# edit DATABASE_URL and ADMIN_SECRET

npm install
npm run dev
```

- Home: [http://localhost:3000](http://localhost:3000)
- Admin upload: [http://localhost:3000/admin](http://localhost:3000/admin)
- Public view: `http://localhost:3000/s/<slug>` (slug returned after upload)

## Vercel

1. Create a Postgres database (or use Neon) and run `001_cas_publications.sql`.
2. Create a Vercel project from this repo / directory.
3. Set `DATABASE_URL` and `ADMIN_SECRET` in Project → Settings → Environment Variables.
4. Deploy.

## How it works

1. **Admin** posts a CAS `.xlsx` with `Authorization: Bearer <ADMIN_SECRET>` (the web UI at `/admin` does this).
2. The server parses **Program Attributes**, **Recommendations**, **Questions**, **Answers**, **Documents**, **Org Questions**, **Org Answers** (missing sheets are OK).
3. Rows are **grouped** by a stable key (`WebAdMIT Label`, else `ProgramCode` / `Program Code`, else `Unique ID`, else organization + program + cycle). Within a group, **shared** fields become the summary; **term lines** list each application window (term + open / deadlines).
4. You choose **which summary columns** appear on the public page; questions / documents / answers / recommendations still show in full for the selected program group.
5. **Public** page `/s/[slug]` loads data from Postgres (no auth). `robots` is set to **noindex** to avoid search indexing of unlisted links (adjust if you want discoverability).

## Security note

`ADMIN_SECRET` gates uploads and column changes. Anyone with the secret can publish. Anyone with a public URL can read that publication. Rotate the secret if it leaks.

## CAS parser dependency

The app uses the [`xlsx`](https://www.npmjs.com/package/xlsx) package for parsing. Only **trusted** CAS files should be uploaded (admin-only). Review `npm audit` if you plan to accept untrusted spreadsheets.
