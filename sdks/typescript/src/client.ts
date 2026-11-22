import { Decision, DecisionResponse } from "./models.js";
import { GovernanceError, NetworkError, UnknownAgent } from "./errors.js";

const DEFAULT_BASE_URL = "https://api.memorygate.dev";
const DEFAULT_TIMEOUT = 5000;
const SDK_VERSION = "0.4.0";

export interface EvaluateInput {
  agentId?: string;
  resource: string;
  action?: string;
  purpose?: string;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface KillSwitchActionInput {
  agentId?: string;
  resource: string;
  patch: Record<string, unknown>;
  action?: string;
  purpose?: string;
  runId?: string;
  sourceContext?: string;
}

export interface ClientOptions {
  /** MemoryGate API key. Falls back to `MEMORYGATE_API_KEY` env. */
  apiKey?: string;
  /** Runtime URL. Defaults to https://api.memorygate.dev or `MEMORYGATE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number;
  /** Default agentId if not passed on every call. */
  defaultAgentId?: string;
  /** Injected fetch (for tests / non-standard runtimes). */
  fetch?: typeof fetch;
}

/**
 * MemoryGate client for Node 18+, Deno, Bun and modern browsers.
 *
 * ```ts
 * import { MemoryGate } from "@memorygate/sdk";
 *
 * const mg = new MemoryGate({ apiKey: process.env.MG_KEY });
 *
 * const d = await mg.evaluate({
 *   agentId:  "agent_crm_copilot",
 *   resource: "customers.read",
 *   action:   "read",
 *   purpose:  "Answer support ticket #4212",
 *   payload:  { customerId: 42 },
 * });
 *
 * if (d.allowed) await crm.read(d.effectivePayload);
 * else           throw d.toException();
 * ```
 */
export class MemoryGate {
  public readonly baseUrl: string;
  public readonly defaultAgentId?: string;

  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly _fetch: typeof fetch;

  constructor(opts: ClientOptions = {}) {
    const apiKey =
      opts.apiKey ??
      (typeof process !== "undefined"
        ? process.env?.MEMORYGATE_API_KEY
        : undefined);
    if (!apiKey) {
      throw new GovernanceError(
        "Missing apiKey. Pass apiKey=... or set MEMORYGATE_API_KEY.",
      );
    }
    const envBase =
      typeof process !== "undefined" ? process.env?.MEMORYGATE_URL : undefined;
    this.baseUrl = (opts.baseUrl ?? envBase ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": `memorygate-node/${SDK_VERSION}`,
    };
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
    this._fetch = opts.fetch ?? fetch;
    this.defaultAgentId = opts.defaultAgentId;
  }

  /**
   * Evaluate one agent action against the tenant's policy graph.
   * Returns a {@link Decision}. Never throws on `block` / `escalate` —
   * inspect `.allowed` / `.effect` or use {@link MemoryGate.guard} instead.
   */
  async evaluate(input: EvaluateInput): Promise<Decision> {
    const agentId = input.agentId ?? this.defaultAgentId;
    if (!agentId) {
      throw new GovernanceError(
        "agentId is required (or set defaultAgentId on the client).",
      );
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this._fetch(`${this.baseUrl}/api/evaluate`, {
        method: "POST",
        headers: this.headers,
        signal: controller.signal,
        body: JSON.stringify({
          agent_id: agentId,
          resource: input.resource,
          action: input.action ?? "read",
          purpose: input.purpose ?? "",
          payload: input.payload ?? {},
          context: input.context ?? {},
        }),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new NetworkError(msg);
    } finally {
      clearTimeout(t);
    }
    if (res.status === 404) {
      throw new UnknownAgent(await res.text());
    }
    if (!res.ok) {
      throw new GovernanceError(
        `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
    }
    const body = (await res.json()) as DecisionResponse;
    return new Decision(body);
  }

  /** Submit a protected mutation through the RuntimeOS Kill Switch gateway. */
  async killSwitchAction(input: KillSwitchActionInput): Promise<Record<string, unknown>> {
    const agentId = input.agentId ?? this.defaultAgentId;
    if (!agentId) throw new GovernanceError("agentId is required (or set defaultAgentId on the client).");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this._fetch(`${this.baseUrl}/api/killswitch/actions`, {
        method: "POST", headers: this.headers, signal: controller.signal,
        body: JSON.stringify({
          agent_id: agentId, resource: input.resource, patch: input.patch,
          action: input.action ?? "write", purpose: input.purpose ?? "",
          run_id: input.runId, source_context: input.sourceContext,
        }),
      });
      if (!res.ok) throw new GovernanceError(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as Record<string, unknown>;
    } catch (e: unknown) {
      if (e instanceof GovernanceError) throw e;
      throw new NetworkError(e instanceof Error ? e.message : String(e));
    } finally { clearTimeout(t); }
  }

  async killSwitchOverview(): Promise<Record<string, unknown>> {
    const res = await this._fetch(`${this.baseUrl}/api/killswitch/overview`, { headers: this.headers });
    if (!res.ok) throw new GovernanceError(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as Record<string, unknown>;
  }

  async quarantineAgent(agentId: string): Promise<Record<string, unknown>> {
    const res = await this._fetch(`${this.baseUrl}/api/killswitch/agents/${encodeURIComponent(agentId)}/quarantine`, { method: "POST", headers: this.headers });
    if (!res.ok) throw new GovernanceError(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as Record<string, unknown>;
  }

  async recoverChange(changeId: string): Promise<Record<string, unknown>> {
    const res = await this._fetch(`${this.baseUrl}/api/killswitch/changes/${encodeURIComponent(changeId)}/recover`, { method: "POST", headers: this.headers });
    if (!res.ok) throw new GovernanceError(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as Record<string, unknown>;
  }

  /**
   * Like {@link evaluate}, but raises if the decision is not allow/modify.
   * Use in code where a block or escalation should propagate as an exception.
   */
  async guard(input: EvaluateInput): Promise<Decision> {
    const d = await this.evaluate(input);
    if (!d.allowed) throw d.toException();
    return d;
  }
}
