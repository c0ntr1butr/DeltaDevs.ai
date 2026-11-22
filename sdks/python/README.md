# agentflow — runtime governance for autonomous AI agents

Framework-agnostic middleware that evaluates every agent action against
identity, policy, context, and risk **before** it reaches your enterprise
systems.

    pip install agentflow

## Quickstart

```python
from agentflow import Client

mg = Client(api_key="mg_...")   # from the Agentflow console

decision = mg.evaluate(
    agent_id="agent_crm_copilot",
    resource="customers.read",
    action="read",
    purpose="Answer support ticket #4212",
    payload={"customer_id": 42},
)

if decision.allowed:
    result = crm.read(decision.effective_payload)
else:
    raise decision.to_exception()      # PermissionDenied or HumanApprovalRequired
```

Or use `.guard()` which raises on non-allow decisions:

```python
payload = mg.guard(
    resource="prod.deploy", action="execute",
    purpose="Release v1.2.3", payload={"version": "1.2.3"},
).effective_payload
run_deploy(payload)
```

## Framework middleware

Install with the extra you need:

```bash
pip install agentflow[langgraph]     # LangGraph
pip install agentflow[openai]        # OpenAI Agents SDK
pip install agentflow[crewai]        # CrewAI
pip install agentflow[google]        # Google ADK
pip install agentflow[mcp]           # MCP proxy
```

### LangGraph
```python
from agentflow.middleware.langgraph import governed_node
graph.add_node("crm", governed_node(call_crm, mg=mg,
    agent_id="agent_crm_copilot",
    resource_from=lambda s: f"crm.{s['action']}",
    payload_from=lambda s: s["query"]))
```

### OpenAI Agents SDK
```python
from agentflow.middleware.openai_agents import governed
guarded = governed(agent, mg=mg, agent_id="agent_crm_copilot")
```

### CrewAI
```python
from agentflow.middleware.crewai import GovernedCrew
crew = GovernedCrew(agents=[analyst], tasks=[task], mg=mg,
                    agent_id_for=lambda a: f"agent_{a.role}")
```

### Google ADK
```python
from agentflow.middleware.google_adk import governed
guarded = governed(agent, mg=mg, agent_id="agent_gemini_crm")
```

### MCP proxy
```bash
agentflow mcp-proxy \
    --upstream https://mcp.internal.example.com \
    --api-key mg_... \
    --agent-id agent_mcp_gateway \
    --listen 0.0.0.0:7443
```

Point any MCP client at `http://localhost:7443/mcp` and every `tools/call`
is evaluated by Agentflow before it reaches the real server.

## Environment variables

- `AGENTFLOW_API_KEY` — used if `api_key=` is not passed to `Client()`.
- `AGENTFLOW_URL`     — defaults to `https://api.agentflow.dev`.

## License

Apache-2.0.


## RuntimeOS Kill Switch

The same client can submit a governed mutation, inspect Kill Switch counters, quarantine one agent or request field-scoped recovery:

```python
result = mg.kill_switch_action(
    agent_id="agent_123", resource="supplier:SUP-100",
    action="write", purpose="supplier_onboarding",
    patch={"status": "verified"},
)
print(result["decision"], result.get("executed"))
summary = mg.kill_switch_overview()
```
