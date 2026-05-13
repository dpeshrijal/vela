import { VelaError } from "../../common/errors.js";
import { getIdentityResult } from "../../orchestration/identity/identityOrchestrator.js";
import type { GetIdentityResultResponse } from "../../orchestration/identity/identity.types.js";
import type { McpToolDefinition } from "../mcpServer.js";

export const getIdentityResultToolName = "vela_compliance_get_identity_result";

export interface GetIdentityResultToolInput {
  agent_token: string;
  verification_id: string;
}

export const getIdentityResultTool: McpToolDefinition<unknown, GetIdentityResultResponse> = {
  name: getIdentityResultToolName,
  description: "Fetch the latest identity verification result from the selected KYC vendor.",
  async handler(input) {
    const parsedInput = parseGetIdentityResultInput(input);

    return getIdentityResult({
      agentToken: parsedInput.agent_token,
      verificationId: parsedInput.verification_id
    });
  }
};

function parseGetIdentityResultInput(input: unknown): GetIdentityResultToolInput {
  if (!isRecord(input)) {
    throw new VelaError("Tool input must be an object");
  }

  if (typeof input.agent_token !== "string" || input.agent_token.length === 0) {
    throw new VelaError("Missing required field: agent_token");
  }

  if (typeof input.verification_id !== "string" || input.verification_id.length === 0) {
    throw new VelaError("Missing required field: verification_id");
  }

  return {
    agent_token: input.agent_token,
    verification_id: input.verification_id
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
