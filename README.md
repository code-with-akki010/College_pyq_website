# CampusBytes

CampusBytes uses GitHub Pages for the frontend and a Node/Express API for uploads and paper retrieval. The backend now supports Supabase as the persistent free storage option.

## Hosting Layout

- GitHub Pages: `index.html`, `admin.html`, CSS, and browser JavaScript.
- Render/backend API: upload, list, preview, download, delete.
- Supabase: permanent metadata table and PDF storage bucket.
- SQLite: local fallback only when Supabase environment variables are not set.

## Frontend Config

`config.js` should point GitHub Pages to the backend:

```js
window.CampusBytesConfig = {
  API_BASE_URL: "https://college-pyq-website-1.onrender.com",
};
```

## Supabase Setup

Create a Supabase project, then run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  semester integer not null check (semester between 1 and 8),
  subject text not null,
  category text not null check (category in ('Internal', 'External', 'Practical')),
  year integer not null,
  filename text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/pdf',
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

create index if not exists papers_sort_idx
  on public.papers (year desc, semester asc, subject asc, category asc);
```

Create a private Storage bucket named:

```text
papers
```

## Render Environment Variables

Set these on the Render backend service:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_BUCKET=papers
SUPABASE_TABLE=papers
MAX_FILE_SIZE_MB=50
```

Use the Supabase `service_role` key on Render only. Never put it in GitHub Pages, `config.js`, or frontend JavaScript.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check backend and storage status |
| `GET` | `/api/papers` | Return paper metadata |
| `GET` | `/api/papers/events` | Live paper-library updates |
| `GET` | `/api/papers/:id/file` | Stream a PDF |
| `POST` | `/api/upload` | Upload a PDF |
| `DELETE` | `/api/papers/:id` | Delete one paper |

Uploads use `multipart/form-data`:

- `semester`
- `subject`
- `category`
- `year`
- `file`

## Local Setup

```bash
npm install
npm start
```

If Supabase env vars are set, local development uses Supabase. If they are missing, the server uses local `campusbytes.sqlite` as a fallback.

## Notes

- `.nojekyll` keeps GitHub Pages in static-file mode.
- Do not commit `campusbytes.sqlite`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- After Supabase is configured, uploaded files will not vanish when Render restarts.
