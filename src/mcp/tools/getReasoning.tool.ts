import { getReasoningLogById } from "../../audit/reasoningLog.service.js";
import type { ReasoningLogEntry } from "../../audit/reasoningLog.types.js";
import { authenticateAgent } from "../../auth/authenticateAgent.js";
import { VelaError } from "../../common/errors.js";
import type { McpToolDefinition } from "../mcpServer.js";

export const getReasoningToolName = "vela_audit_get_reasoning";

export interface GetReasoningToolInput {
  agent_token: string;
  reasoning_log_id: string;
}

export const getReasoningTool: McpToolDefinition<unknown, ReasoningLogEntry> = {
  name: getReasoningToolName,
  description: "Retrieve a stored reasoning log by ID.",
  async handler(input) {
    const parsedInput = parseGetReasoningInput(input);

    if (!authenticateAgent(parsedInput.agent_token)) {
      throw new VelaError("Invalid demo agent token");
    }

    return getReasoningLogById(parsedInput.reasoning_log_id);
  }
};

function parseGetReasoningInput(input: unknown): GetReasoningToolInput {
  if (!isRecord(input)) {
    throw new VelaError("Tool input must be an object");
  }

  if (typeof input.agent_token !== "string" || input.agent_token.length === 0) {
    throw new VelaError("Missing required field: agent_token");
  }

  if (typeof input.reasoning_log_id !== "string" || input.reasoning_log_id.length === 0) {
    throw new VelaError("Missing required field: reasoning_log_id");
  }

  return {
    agent_token: input.agent_token,
    reasoning_log_id: input.reasoning_log_id
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
