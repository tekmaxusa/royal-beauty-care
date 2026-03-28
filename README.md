<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b327323a-0904-43bb-8b14-1203fd7ec5f0

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Optional: set `GEMINI_API_KEY` in `.env.local` for AI features
3. Run the SPA: `npm run dev` (proxies `/api` to `http://127.0.0.1:8080` by default)

### Full stack with Docker (PHP + MySQL + Vite)

From the repo root:

```bash
cp api/.env.example api/.env   # optional
docker compose up --build -d
```

- App: http://localhost:3000  
- API: http://localhost:8080  
- phpMyAdmin: http://localhost:8081  

See **`docker/README.md`** and **`api/README.md`**. **cPanel** deploy uses `scripts/deploy-cpanel.sh`, not Docker.
