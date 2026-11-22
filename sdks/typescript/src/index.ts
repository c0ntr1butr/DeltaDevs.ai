/**
 * agentflow-sdk — Runtime governance for autonomous AI agents.
 *
 *   npm install agentflow-sdk
 *
 *   import { Agentflow } from "agentflow-sdk";
 *   const mg = new Agentflow({ apiKey: process.env.MG_KEY });
 *   const d  = await mg.guard({ resource: "customers.read", agentId: "..." });
 *
 * Framework middleware ships under sub-paths:
 *   `agentflow-sdk/middleware/langgraph`
 *   `agentflow-sdk/middleware/openai-agents`
 *   `agentflow-sdk/middleware/crewai`
 *   `agentflow-sdk/middleware/google-adk`
 *   `agentflow-sdk/middleware/mcp`
 */
export { Agentflow } from "./client.js";
export type {
  ClientOptions,
  EvaluateInput,
  KillSwitchActionInput,
} from "./client.js";
export {
  Decision,
} from "./models.js";
export type {
  Effect,
  TraceStep,
  DecisionResponse,
} from "./models.js";
export {
  GovernanceError,
  NetworkError,
  UnknownAgent,
  PermissionDenied,
  HumanApprovalRequired,
} from "./errors.js";

export default { name: "agentflow-sdk", version: "0.4.0" };
