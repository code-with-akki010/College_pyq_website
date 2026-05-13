# CampusBytes

CampusBytes is a previous-year-question-paper portal with a static frontend and a Node/Express API. GitHub Pages can host the frontend, while the backend stores paper metadata and PDF bytes in a SQLite database.

## What Runs Where

- GitHub Pages: `index.html`, `admin.html`, CSS, and browser JavaScript.
- Backend API: upload, list, preview, download, and delete papers.
- Database: `campusbytes.sqlite`, generated at runtime and ignored by Git.

The frontend reads `config.js` to find the API:

```js
window.CampusBytesConfig = {
  API_BASE_URL: "https://college-pyq-website-1.onrender.com",
};
```

Use `http://localhost:3000` when testing the full stack locally.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API and database status |
| `GET` | `/api/papers` | Return paper metadata |
| `GET` | `/api/papers/events` | Live paper-library updates for the frontend |
| `GET` | `/api/papers/:id/file` | Stream the PDF from the database |
| `POST` | `/api/upload` | Upload a PDF into the database |
| `DELETE` | `/api/papers/:id` | Delete one paper |

Uploads use `multipart/form-data` with these fields:

- `semester`
- `subject`
- `category`
- `year`
- `file`

Only PDF uploads are accepted. The default file limit is 10 MB and can be changed with `MAX_FILE_SIZE_MB`.

The student page listens to `/api/papers/events` with Server-Sent Events. When an admin uploads or deletes a paper, open student pages refresh the paper list, Smart Recommendations, Exam Sprint, and Study Intelligence automatically. Browsers without SSE support fall back to a 30-second API refresh.

## Local Setup

```bash
npm install
npm start
```

Then open:

- Student portal: `http://localhost:3000`
- Admin login: `http://localhost:3000/login.html`

On first startup, if the database is empty and an old `papers/` folder exists, the server imports those PDFs into SQLite once. After that, browsing and uploads use the database, not `papers.json` or static PDF paths.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | API port |
| `DB_FILE` | `campusbytes.sqlite` | SQLite database file path |
| `MAX_FILE_SIZE_MB` | `10` | Upload limit |

The backend needs Node.js 22.5 or newer because it uses Node's built-in SQLite module.

## Deployment Notes

1. Deploy the frontend files to GitHub Pages.
2. Deploy the Node backend to a service that supports persistent disk storage.
3. Set `API_BASE_URL` in `config.js` to the backend URL.
4. Keep `campusbytes.sqlite` on the backend host, not in the GitHub Pages repository.

Render free instances can lose local disk data when redeployed unless persistent disk is configured. For long-term production storage, use a persistent volume or a managed database/storage service.
