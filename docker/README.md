# Docker (local development — Royal Beauty Care)

These files are for **local** full-stack dev only. **cPanel production** does not use Docker; use `scripts/deploy-cpanel.sh` to sync `dist/` and `api/`.

## Layout

| Path | Purpose |
|------|--------|
| `../docker-compose.yml` | Run from **repository root**: `docker compose up`. Starts Vite `frontend`, PHP `web`, MySQL `db`, `phpmyadmin`. |
| `web/Dockerfile` | PHP 8.2 + Apache (`pdo_mysql`, `mbstring`, rewrite). |
| `web/apache/000-default.conf` | `DocumentRoot` → `/var/www/html/public`. |

The `web` service mounts **`api/`** from the repo root; this folder only builds the image.

## Quick start

```bash
cp api/.env.example api/.env   # optional; Compose sets DB_* on web if unset
docker compose up --build -d
```

| Service | URL (defaults) |
|---------|----------------|
| SPA (Vite) | http://localhost:3000 |
| PHP API | http://localhost:8080 |
| phpMyAdmin | http://localhost:8081 |

MySQL on the host: **127.0.0.1:3307** (see `DB_PORT` in `api/.env.example`).

Default DB name: **`royal_beauty_care`** (matches `api/.env.example`).

## Useful commands

```bash
docker compose ps
docker compose logs -f web
docker compose down          # stop
docker compose down -v       # stop and delete DB volume
```

More API/env detail: **`api/README.md`**.
