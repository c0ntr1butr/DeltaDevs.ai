# RuntimeOS — Kill Switch Frontend

**DeltaDevs | Build with Bob • Track 3**

React 19 console for the RuntimeOS Kill Switch — external governance and enforcement layer for multi-agent systems.

## Stack

- React 19 + React Router 7
- Tailwind CSS + Radix UI + shadcn/ui
- Recharts + Framer Motion + Lucide
- CRACO build tooling

## Dev setup

```bash
cp .env.example .env
# Set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

Open `http://localhost:3000` → **Console → Kill Switch**.

## Production build

```bash
yarn install --frozen-lockfile
yarn build
```

Output is in `build/`. Deploy to Vercel — see `vercel.json` for SPA route rewrites.

## Environment variables

| Variable | Description |
|---|---|
| `REACT_APP_BACKEND_URL` | Backend API base URL (no trailing slash) |
