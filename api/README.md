# Royal Beauty Care — local PHP + MySQL (Docker)

Salon app: signup/login with hashed passwords, sessions, and appointments with **one booking per date+time** (DB unique key + server checks). No heavy frameworks.

This backend supports booking, client accounts, and a merchant admin UI. Copy and images are driven from `config/salon_data.php` and `public/assets/`. Booking and account flows are handled by the **Vite/React** app. New appointments are stored as **confirmed** immediately (slot is reserved). The merchant can **cancel** in the admin UI; **cancellation** emails the client (HTML + plain multipart). **New booking** emails both the **salon** (`CONTACT_MAIL_TO`) and the **client**.

The repo root also includes an optional **Vite/React** app and **`public/api/`** JSON endpoints for the same backend when you want a JavaScript-only UI (`npm run dev` / Docker **`frontend`**).

**Contact Us** matches the reference layout (name, email, phone, message, **Send Message**) and posts to **`/contact-send.php`**. Notifications are sent via configured email delivery (SMTP or `mail()` fallback).

### Gmail sending limits (approximate)

| Channel | Typical daily limit (personal Gmail) | Notes |
|--------|--------------------------------------|--------|
| **Gmail (SMTP / “Send mail as”)** | About **500 recipients per day** | Google may throttle or pause if spam-like; Workspace limits are higher. |
For a busy salon, prefer **Workspace** or a transactional provider (SendGrid, etc.).

CSRF, honeypot, and a short rate limit protect the contact form.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose)

## Quick start

1. **Copy environment file** (optional — defaults work for local dev):

   Always run Docker Compose from the **repository root** (see `docker/README.md`). Copy the API env file:

   ```bash
   cp api/.env.example api/.env
   ```

   On Windows (CMD): `copy api\.env.example api\.env`

2. **Build and start**:

   ```bash
   docker compose up --build -d
   ```

   Compose starts **`frontend`** (Vite on **`FRONTEND_PORT`**, default `3000`) that proxies `/api` to **`web`**, plus **MySQL** (`db`) and **phpMyAdmin** — one shared database.

3. **Open the app**: [http://localhost:8080](http://localhost:8080) for the PHP site (not port 80 — other tools may use that).  
   - Plain check: [http://localhost:8080/status.php](http://localhost:8080/status.php) → `server is up and running.`  
   - Sign up → log in → **Dashboard** lists your bookings and lets you book 30-minute slots (9:00–17:00).  
   - **Merchant dashboard:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login) — staff **Sign in** only; first admin is created from **`ADMIN_NAME`**, **`ADMIN_EMAIL`**, and **`ADMIN_INITIAL_PASSWORD`** in `.env` when no admin exists. Then `/admin/bookings` and `/admin/users` in the SPA.  
   - With root Compose, the React UI is [http://localhost:3000](http://localhost:3000).

4. **Database in the browser (Docker phpMyAdmin)**: [http://localhost:8081](http://localhost:8081) (default `PMA_PORT`; change in `.env` if needed).  
   - Login: **`salon_user`** / **`salon_secret`** (or **`root`** / **`DB_ROOT_PASSWORD`**).  
   - Server field: **`db`** (pre-filled) — same MySQL instance the app uses inside Docker.

**Port 3306 in use?** MySQL from Compose maps to host **`3307`** by default (`DB_PORT` in `.env`). Change it if that port is taken too.

### `ERR_CONNECTION_REFUSED` on localhost

This means **nothing is listening on the port you opened** (or Docker is not running).

1. **Open Docker Desktop** (Windows) and wait until the engine is “running” (whale icon in the system tray).
2. From the **repository root** (not inside `api/`):

   ```bash
   docker compose up -d
   ```

3. **Correct URLs / ports:**

   | Goal | URL / settings |
   |---------|----------------|
   | **React / Vite UI (main site)** | **http://localhost:3000** — service **`frontend`**; `/api` is proxied to PHP |
   | PHP API & legacy `.php` pages | **http://localhost:8080** — service **`web`** (`/public/api/*`, OAuth, admin PHP if needed) |
   | phpMyAdmin (Docker) | **http://localhost:8081** |
   | MySQL from the host (XAMPP, HeidiSQL, etc.) | Host **127.0.0.1**, port **3307**, user **`salon_user`**, password from `.env` |

4. **Check that containers are running:**

   ```bash
   docker compose ps
   ```

   `rbc-frontend`, `rbc-web`, `rbc-mysql`, and (if you use the browser DB UI) `rbc-phpmyadmin` should be **Up**. First start runs `npm ci` in the frontend container (can take a minute). If phpMyAdmin is missing, run: `docker compose up phpmyadmin -d`.

If port `3306` is already in use on your machine, keep Compose on `DB_PORT=3307` (default) or change `DB_PORT` in `.env`.

**Already ran Docker before (old DB)?** On first DB connection the app runs **`config/schema_auto_migrate.php`** and adds missing columns (`users.role`, `bookings.status`, `service_category`, `service_name`, guest contact fields, `google_sub`, nullable `password`) and drops the old **unique (date, time)** index if present so **cancelled** slots can be re-booked. Requires `ALTER` privilege (default Docker user has it).

### Merchant admin (`/admin/`)

- Admins are normal rows in **`users`** with **`role = 'admin'`** (same table as clients; clients default to **`client`**).
- **No self-service merchant sign-up.** The first admin is created when the app connects to the database and **no** admin row exists yet: set **`ADMIN_NAME`**, **`ADMIN_EMAIL`**, and **`ADMIN_INITIAL_PASSWORD`** in **`.env`** (see `config/schema_auto_migrate.php`). Sign in at **`/admin/login`** with that **email** and password. Additional admins require a direct database change or promoting another user (e.g. SQL / temporary `.env` promotion).
- **`/admin/bookings`** = all bookings (confirm/cancel); **`/admin/users`** = client accounts + list of admins + **create client accounts only**. Client sign-out uses the API-backed SPA logout flow.

Schema upgrades on existing databases are applied automatically by **`config/schema_auto_migrate.php`** when the app connects. To reset local data: `docker compose down -v` (deletes the DB volume).

**Google sign-in (“Continue with Google”):**  
If `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are missing, the Google button falls back to opening `https://accounts.google.com/` in a new tab; when configured, it uses **server OAuth** (`/google-oauth-start.php`) so users return logged in.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials** → **OAuth client ID** → type **Web application**.  
2. Under **Authorized redirect URIs**, add **exactly** (no trailing slash on the path):  
   - Local: `http://localhost:8080/google-oauth-callback.php`  
   - Live: `https://YOUR-DOMAIN.com/google-oauth-callback.php`  
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in **`.env`** (loaded by `config/env.php`) or in Docker `environment:`.  
4. **Published site behind HTTPS** (Cloudflare, nginx TLS, etc.): the app uses `X-Forwarded-Proto` / `X-Forwarded-Host` when present. If Google still says **redirect_uri_mismatch**, set **`GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN.com/google-oauth-callback.php`** explicitly in `.env`.  
5. OAuth consent screen must be configured (External + test users, or In production).

4. **Stop**:

   ```bash
   docker compose down
   ```

   To wipe the database volume as well: `docker compose down -v`

## Project layout

| Path | Role |
|------|------|
| `../docker-compose.yml` | Local full stack (repo root): frontend + PHP `web` + MySQL + phpMyAdmin |
| `../docker/web/Dockerfile` | PHP-Apache image for `web` (`pdo_mysql`, rewrite) |
| `../docker/web/apache/000-default.conf` | Apache `DocumentRoot` → `/var/www/html/public` |
| `sql/schema.sql` | Tables: `users.role`, `bookings.status` (no unique on slot — enforced in app for pending/confirmed) |
| `config/database.php` | PDO factory (`ATTR_EMULATE_PREPARES` off) |
| `config/session.php` | Session bootstrap, `require_login()` |
| `auth/signup.php` | `register_user()` — `password_hash`, prepared INSERT |
| `auth/login.php` | `login_user()` / `logout_user()` — `password_verify`, `session_regenerate_id`, `user_role` |
| `auth/admin_auth.php` | `login_admin_user()`, `require_admin()` |
| `booking/booking.php` | `create_booking` (pending), `admin_set_booking_status`, slot checks |
| `public/` | API endpoints, OAuth endpoints, utility routes (`status.php`, `logout.php`) |
| `config/contact_mail.php` | `mail()` helpers (contact + booking) |
| `config/salon_notify.php` | Orchestrates contact and booking notification mail |

## Environment variables

Defined in `.env` / root `docker-compose.yml`:

- `WEB_PORT` — host port for Apache (default `8080`)
- `PMA_PORT` — host port for Docker **phpMyAdmin** (default `8081`)
- `DB_HOST` — inside the Docker web container the default is `db`
- `DB_PORT` — optional; from the host use `3307` by default (maps to MySQL `3306` in Docker)
- `DB_NAME`, `DB_USER`, `DB_PASS` — app database credentials
- `DB_ROOT_PASSWORD` — MySQL root (change for anything beyond local dev)

The `web` service receives `DB_HOST=db`, `DB_NAME`, `DB_USER`, `DB_PASS` automatically (no `DB_PORT` in the container — default `3306` on the Compose network).

- `CONTACT_MAIL_TO` — optional; overrides salon `contact_email` for the contact form
- `CONTACT_MAIL_FROM` — optional; **From** header for `mail()` (use a domain your provider accepts)
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` — optional; create/promote first **admin** when none exists (DB bootstrap; sign-in uses **email** + password; see Merchant admin above)
- `ALLOWED_ORIGINS`, `CHB_SESSION_CROSS_SITE` — used by **`public/api/`** when the React app calls the API from another origin (see `.env.example`)

## Security notes (implemented)

- Passwords: `password_hash()` / `password_verify()`
- Queries: PDO prepared statements, emulated prepares disabled
- Sessions: strict mode, HTTP-only cookies, SameSite=Lax, regenerate ID on login
- Slots: `UNIQUE (booking_date, booking_time)` + check before insert + user feedback for taken slots

## Reference repos

The [tekmaxwebsite](https://github.com/tekmaxusa/tekmaxwebsite) repo was not reachable from this environment; auth follows common secure PHP session patterns. [tigerleetkd](https://github.com/qiangcui/tigerleetkd) is a React/Vite marketing site (schedule PDF, etc.); this app implements **server-side** slot booking with MySQL instead.
