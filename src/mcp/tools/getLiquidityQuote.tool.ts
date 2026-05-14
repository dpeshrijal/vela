import { VelaError } from "../../common/errors.js";
import { getLiquidityQuote } from "../../orchestration/liquidity/liquidityOrchestrator.js";
import type {
  LiquidityQuoteRequest,
  LiquidityQuoteResponse
} from "../../orchestration/liquidity/liquidity.types.js";
import type { McpToolDefinition } from "../mcpServer.js";

export const getLiquidityQuoteToolName = "vela_liquidity_get_quote";

export interface GetLiquidityQuoteToolInput {
  agent_token: string;
  payload: LiquidityQuoteRequest;
}

export const getLiquidityQuoteTool: McpToolDefinition<unknown, LiquidityQuoteResponse> = {
  name: getLiquidityQuoteToolName,
  description: "Create a real liquidity quote through the configured liquidity vendor.",
  async handler(input) {
    const parsedInput = parseGetLiquidityQuoteInput(input);

    return getLiquidityQuote({
      agentToken: parsedInput.agent_token,
      payload: parsedInput.payload
    });
  }
};

function parseGetLiquidityQuoteInput(input: unknown): GetLiquidityQuoteToolInput {
  if (!isRecord(input)) {
    throw new VelaError("Tool input must be an object");
  }

  if (typeof input.agent_token !== "string" || input.agent_token.length === 0) {
    throw new VelaError("Missing required field: agent_token");
  }

  if (!isRecord(input.payload)) {
    throw new VelaError("Missing required field: payload");
  }

  const payload = input.payload;

  return {
    agent_token: input.agent_token,
    payload: {
      source_asset: getRequiredString(payload, "source_asset"),
      source_amount: getRequiredString(payload, "source_amount"),
      target_asset: getRequiredString(payload, "target_asset"),
      target_network: getRequiredString(payload, "target_network"),
      idempotency_key: getRequiredString(payload, "idempotency_key")
    }
  };
}

function getRequiredString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];

  if (typeof value !== "string" || value.length === 0) {
    throw new VelaError(`Missing required field: payload.${field}`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
