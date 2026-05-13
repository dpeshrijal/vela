import { appConfig } from "../app/config.js";
import type { AgentToken } from "./agentToken.types.js";

export function authenticateAgent(token: AgentToken): boolean {
  return token === appConfig.demoAgentToken;
}
