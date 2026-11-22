# RuntimeOS Kill Switch — Architecture

The Kill Switch is added to the EmberGround RuntimeOS policy and execution boundary. It does not replace the existing framework adapters, identity, tenant, policy, risk, audit or developer SDK layers.

```text
Agent framework -> ActionRequest -> Identity + delegation -> Existing Policy/Risk Engine
                                                        -> Kill Switch behaviour monitor
                                                        -> allow / block / quarantine
                                                        -> execution boundary + resource adapter
                                                        -> versioned before/after journal
                                                        -> incident response + selective recovery
                                                        -> verification + audit event
```

## Tenant-scoped collections

- `kill_switch_resources`: resource key, JSON state, monotonically increasing version.
- `kill_switch_changes`: agent/run/purpose/resource, patch, before/after state, versions, decision and recovery status.
- `kill_switch_incidents`: severity, detection method, actor and linked change.
- `kill_switch_events`: chronological operator/runtime activity.

## Safety invariants

1. Every operation is scoped to the authenticated organization.
2. The agent must exist and be active.
3. Protected fields and suspicious untrusted context are blocked before normal execution.
4. Each committed write receives a before/after journal entry.
5. Quarantine affects a single agent identity, not the entire tenant.
6. Recovery only reverts fields changed by the target change.
7. Field and resource-version conflicts stop recovery.
8. The attack demo uses only synthetic resource records.

## Production hardening still required

The application-level quarantine marks the registered agent revoked in RuntimeOS. In a real deployment, the same state must also revoke or constrain the agent's external credentials and tool sessions at the execution proxy. Database/API connectors must ensure that agents cannot bypass the gateway. Use durable encrypted snapshots, append-only/tamper-evident audit storage, transactions/CDC, idempotency and provider-specific compensation for irreversible side effects.
