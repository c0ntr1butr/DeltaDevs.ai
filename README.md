# RuntimeOS — The Kill Switch

**DeltaDevs | Build with Bob • Track 3**

RuntimeOS is an external governance and enforcement layer for multi-agent systems. The Kill Switch extension preserves the EmberGround Agentflow.ai / MemoryGate runtime foundation and adds agent-scoped incident detection, quarantine, action provenance and selective recovery.

## Original challenge statement

A network of agents is running and one of them starts doing damage. It corrupts records, spends money it should not, or acts on an instruction someone hid in a document it read. Three questions matter then: What changed? Which agent changed it? And how do you undo it without throwing away everything the other agents got right? Build the layer that answers them. Every action carries the identity of the agent that took it, a monitor watches for behaviour that does not fit, one agent can be quarantined while the rest keep working, and a rollback reverses that agent's damage and nothing else. It sits as a gateway in front of the network, not inside it, so it can protect an agent system somebody else wrote.

## Foundation retained

This project is based on the shipped EmberGround Winning Demo codebase, rather than the earlier small HTML prototype. It retains the existing React console, FastAPI runtime, tenant-scoped Mongo-compatible persistence, policy engine, risk scoring, JWT/RBAC, audit trail, WebSocket decisions stream, webhook integrations, connectors, framework SDKs and evaluation surfaces.

### New Kill Switch capabilities

- External action gateway integrated with the existing RuntimeOS policy evaluator.
- Tenant-scoped agent quarantine and controlled operator release.
- Versioned before/after resource change journal.
- Incident records and runtime event timeline.
- Field-scoped compensating recovery with value/version conflict checks.
- Synthetic three-agent attack simulation.
- React Kill Switch workspace in the existing console.
- Existing agent, policy, SDK and audit foundations retained.

## Architecture

```text
External Agents / LangGraph / OpenAI Agents / CrewAI / Google ADK / MCP
                               |
                               v
                   RuntimeOS Action Boundary
                               |
             Identity + tenant + purpose + context
                               |
                               v
              Existing Policy + Risk Evaluator
                               |
                               v
                Kill Switch Behaviour Monitor
                   |         |           |
                 ALLOW     BLOCK    QUARANTINE
                   |         |           |
                   v         v           v
              Tool / DB   Audit +     Revoke agent
              execution   Incident    credential path
                   |
                   v
          Before / After Change Journal
                   |
                   v
             Recovery Manager
       Version check -> Field diff -> Compensate
                   |
                   v
         Verify state + preserve healthy work

Storage: MongoDB / Motor (tenant scoped)
Frontend: React 19 + React Router + Tailwind + Recharts + Framer Motion + Lucide
Backend: Python + FastAPI + Motor + Pydantic
SDKs: Python + TypeScript; adapters for agent frameworks / MCP
Deployment: Vercel frontend + Render API + MongoDB Atlas
```

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD; MONGO_URL optional for local in-memory demo
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

### Frontend (second terminal)

```bash
cd frontend
cp .env.example .env
yarn install
yarn start
```

Open `http://localhost:3000`, then go to **Console → Kill Switch**. API docs: `http://localhost:8001/api/docs`.

## Kill Switch API

All endpoints are under `/api/killswitch` and inherit the existing tenant authentication/RBAC.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/overview` | KPIs for agents, changes, incidents and recovery |
| GET | `/agents` | Tenant agent registry |
| GET | `/changes` | Before/after change journal |
| GET | `/incidents` | Incident list |
| GET | `/events` | Runtime event timeline |
| GET | `/resources` | Current protected resource state |
| POST | `/actions` | Run a governed resource mutation |
| POST | `/agents/{id}/quarantine` | Quarantine one agent |
| POST | `/agents/{id}/release` | Admin re-authorization |
| POST | `/changes/{id}/recover` | Field-scoped selective recovery |
| POST | `/demo/reset` | Reset the synthetic Kill Switch workspace |
| POST | `/demo/run` | Run the end-to-end three-agent simulation |

The console uses the same API client and auth context as the existing RuntimeOS product.

## The three-agent demo

1. Research Agent performs a legitimate supplier update.
2. Inventory Agent updates a separate stock record.
3. Finance Agent performs a simulated harmful bank-account mutation inside the isolated synthetic resource store.
4. RuntimeOS attributes the write, creates an incident and quarantines only Finance Agent.
5. The recovery manager compares recorded after-state against current fields, reverts only the malicious field and preserves the supplier and inventory work from the other agents.
6. The result panel and journal show recovery verification.

The normal `/actions` endpoint blocks sensitive account/credential fields before execution. The dedicated demo simulation intentionally represents a post-execution compromised write so the rollback path can be shown safely using synthetic data. No real payment or bank action is performed.

## Recovery safety model

- Recovery targets one journalled action and only its patched fields.
- The current field values must still match that action's after-state.
- Conflicts stop recovery; they are never overwritten silently.
- Concurrent writes are checked using resource versions.
- Arbitrary external side effects cannot be universally undone; production adapters must implement provider-specific compensation or human escalation.

## Deploy frontend to Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Set **Root Directory** to `frontend`.
4. Framework preset: Create React App / Other (the repository uses CRACO).
5. Build command: `yarn build`; output directory: `build`.
6. Environment variable: `REACT_APP_BACKEND_URL=https://<your-render-api>.onrender.com`.
7. `frontend/vercel.json` already contains SPA route rewrites.

## Deploy backend to Render

1. Create a MongoDB Atlas database and allow the Render service network to connect.
2. Push the repository to GitHub and create a Render Blueprint from `render.yaml`, or create a Python web service manually.
3. Root directory: `backend`; build: `pip install -r requirements.txt`; start: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
4. Set `MONGO_URL`, `DB_NAME=runtimeos`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ORG_NAME`, `ENVIRONMENT=production`, and `ALLOWED_ORIGINS=https://<your-vercel-domain>`.
5. Set optional n8n, Dodo and Breeth integration credentials only when those services are configured.
6. Confirm `https://<your-render-api>/api/` returns `ok: true` and `https://<your-render-api>/api/docs` loads.
7. Set the Vercel `REACT_APP_BACKEND_URL` to the Render API URL and redeploy the frontend.

For local development without MongoDB, the inherited `mongomock-motor` fallback is available. It is in-memory and not persistent; use MongoDB Atlas for hosted deployments.

## Testing

```bash
cd backend
pytest -q
```

Frontend production build:

```bash
cd frontend
yarn install --frozen-lockfile
yarn build
```

## Project structure

```text
MemoryOS/                    # Existing EmberGround product foundation (rebranded in console)
  backend/server.py          # Existing API + integrated Kill Switch routes
  frontend/src/pages/        # Existing console + new KillSwitch.jsx
  sdks/python/               # Existing Python SDK + adapters
  sdks/typescript/           # Existing TypeScript SDK
  integrations/n8n/          # Existing automation integration
  benchmarks/                # Existing benchmark harness
  render.yaml                # Backend deployment blueprint
  frontend/vercel.json       # Vercel SPA configuration
  docs/                      # Architecture, demo, deployment notes
```

## Team

**DeltaDevs** — Build with Bob | Track 3: The Kill Switch
