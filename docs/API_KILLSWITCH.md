# Kill Switch API

Authenticated endpoints under `/api/killswitch`:

- `GET /overview` — summary counters.
- `GET /agents` — agent registry.
- `GET /changes` — change journal.
- `GET /incidents` — incident list.
- `GET /events` — runtime audit timeline.
- `GET /resources` — synthetic protected resources.
- `POST /actions` — `agent_id`, `resource`, `action`, `purpose`, `run_id`, `patch`, optional `source_context`.
- `POST /agents/{agent_id}/quarantine` — editor or higher.
- `POST /agents/{agent_id}/release` — admin or owner.
- `POST /changes/{change_id}/recover` — editor or higher.
- `POST /demo/reset` and `POST /demo/run` — editor or higher; isolated synthetic scenario.

Normal protected writes call the existing RuntimeOS policy evaluator first. Sensitive banking/credential fields, protected governance fields and recognised prompt-injection indicators are denied and quarantined. The deterministic demo intentionally runs a synthetic compromised write after the normal evaluation, then demonstrates detection and recovery.
