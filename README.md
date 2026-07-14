# SC FundSafe - Client (React + TypeScript + Tailwind)

The web UI for SC FundSafe, built to match the same dark, glassmorphism /
emerald-gradient design, and wired directly to the real `SCFundSafe.API`
backend (JWT auth, ASP.NET Core Identity, Dapper) instead of mock data.

> **Open this folder in Visual Studio Code (🔵 blue icon)**, not Visual
> Studio (🟣 purple icon). Use `File > Open Folder` and select this
> `SCFundSafe-UI` folder specifically. Visual Studio (the .NET IDE) is for the
> `SCFundSafe.API` backend only.

## Tech stack
- React 18 + TypeScript
- Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- react-router-dom for routing
- sonner for toast notifications
- lucide-react for icons

## Pages / use cases

| Page | Route | Use case |
|---|---|---|
| Auth (login/register) | `/auth` | UC-01 (+ account creation) |
| Dashboard | `/dashboard` | UC-04 View Balance (+ recent activity) |
| Record Income | `/income` | UC-02 (Treasurer only) |
| Record Expense | `/expenses` | UC-03 (Treasurer only) |
| Records | `/records` | UC-05 Search, UC-07 Update Entry (edit is Treasurer only) |
| Reports | `/reports` | UC-06 Generate Reports |

Logging out (UC-08) is available from the sidebar / mobile top bar.

## Setup

1. Make sure the `SCFundSafe.API` project is running (see the root README)
   and that you've run the SQL script in SSMS first.
2. Copy the env file and adjust the API URL if needed:
   ```bash
   cd SCFundSafe-UI
   cp .env.example .env
   ```
   By default it points at `https://localhost:7050/api`, matching the API's
   `launchSettings.json`.
3. Install dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```
4. Open the printed local URL (usually `http://localhost:5173`).

## Notes
- **HTTPS certificate**: since the API uses a local HTTPS dev certificate,
  your browser may block requests the first time. Visit
  `https://localhost:7050/swagger` once in the same browser and accept the
  certificate warning, or run `dotnet dev-certs https --trust` on your
  machine.
- **Roles**: when registering, choose a role — only `Treasurer` can record
  income/expense or edit records. `Officer` and `Adviser` can view the
  dashboard, records, and reports (matching the API's role-based
  authorization). `ClassRepresentative` currently only sees the dashboard.
- **No delete endpoint**: the API doesn't expose a delete-record endpoint
  (it isn't one of the eight use cases), so the Records page only supports
  search and edit, not delete.
- This app talks directly to the API with `fetch` + a bearer token stored
  in `localStorage` (see `src/lib/api.ts` and `src/lib/auth-context.tsx`) -
  no mock/local data is used.
