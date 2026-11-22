# Deployment: Vercel + Render

## Vercel frontend
- Root: `frontend`
- Install: `yarn install --frozen-lockfile`
- Build: `yarn build`
- Output: `build`
- Env: `REACT_APP_BACKEND_URL=https://<render-api-domain>`
- SPA rewrite: configured in `frontend/vercel.json`

## Render API
- Root: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Health: `/api/`
- Required env: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ORG_NAME`, `ENVIRONMENT=production`, `ALLOWED_ORIGINS`

Use MongoDB Atlas or another durable MongoDB deployment. Do not use the in-memory mongomock fallback in production. Add your exact Vercel production origin to `ALLOWED_ORIGINS`; if you deploy preview builds, configure a narrowly scoped origin suffix appropriate for your team.
