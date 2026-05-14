import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { appConfig } from "../app/config.js";
import { getIdentityResultToolName } from "../mcp/tools/getIdentityResult.tool.js";
import { getLiquidityQuoteToolName } from "../mcp/tools/getLiquidityQuote.tool.js";
import { getReasoningToolName } from "../mcp/tools/getReasoning.tool.js";
import { verifyIdentityToolName } from "../mcp/tools/verifyIdentity.tool.js";
import type {
  GetIdentityResultResponse,
  VerifyIdentityRequest,
  VerifyIdentityResponse
} from "../orchestration/identity/identity.types.js";
import type { LiquidityQuoteRequest, LiquidityQuoteResponse } from "../orchestration/liquidity/liquidity.types.js";
import type { ReasoningLogEntry } from "../audit/reasoningLog.types.js";

const mcpServerUrl = process.env.MCP_SERVER_URL ?? "http://localhost:3000/mcp";

const validPayload: VerifyIdentityRequest = {
  external_user_id: "user_mcp_approved_123",
  jurisdiction: "US",
  idempotency_key: "request_mcp_approved_123"
};

const quotePayload: LiquidityQuoteRequest = {
  source_asset: "USD",
  source_amount: "100.00",
  target_asset: "USDT",
  target_network: "tron",
  idempotency_key: "quote_mcp_usd_usdt_tron_123"
};

export async function runMockMcpCustomerAgent(): Promise<void> {
  console.log(`connecting to MCP server: ${mcpServerUrl}`);

  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl), {
    requestInit: {
      headers: {
        "x-agent-token": appConfig.demoAgentToken
      }
    }
  });

  const client = new Client({
    name: "vela-mock-mcp-customer-agent",
    version: "0.1.0"
  });

  try {
    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const toolNames = toolsResponse.tools.map((tool) => tool.name);

    assertToolRegistered(toolNames, verifyIdentityToolName);
    assertToolRegistered(toolNames, getIdentityResultToolName);
    assertToolRegistered(toolNames, getLiquidityQuoteToolName);
    assertToolRegistered(toolNames, getReasoningToolName);

    console.log("available MCP tools:");
    console.log(JSON.stringify(toolNames, null, 2));

    const verificationResult = await client.callTool({
      name: verifyIdentityToolName,
      arguments: { ...validPayload }
    });
    const verificationResponse = parseTextJson<VerifyIdentityResponse>(verificationResult);

    console.log("\nverification response:");
    console.log(JSON.stringify(verificationResponse, null, 2));
    console.log(`\nverification_url: ${verificationResponse.verification_url ?? "not returned by vendor"}`);

    const latestResult = await client.callTool({
      name: getIdentityResultToolName,
      arguments: {
        verification_id: verificationResponse.verification_id
      }
    });
    const latestResponse = parseTextJson<GetIdentityResultResponse>(latestResult);

    console.log("\nlatest identity result response:");
    console.log(JSON.stringify(latestResponse, null, 2));

    const reasoningResult = await client.callTool({
      name: getReasoningToolName,
      arguments: {
        reasoning_log_id: latestResponse.reasoning_log_id
      }
    });
    const reasoningResponse = parseTextJson<ReasoningLogEntry>(reasoningResult);

    console.log("\nreasoning log response:");
    console.log(JSON.stringify(reasoningResponse, null, 2));

    const quoteResult = await client.callTool({
      name: getLiquidityQuoteToolName,
      arguments: { ...quotePayload }
    });
    const quoteResponse = parseTextJson<LiquidityQuoteResponse>(quoteResult);

    console.log("\nliquidity quote response:");
    console.log(JSON.stringify(quoteResponse, null, 2));

    const quoteReasoningResult = await client.callTool({
      name: getReasoningToolName,
      arguments: {
        reasoning_log_id: quoteResponse.reasoning_log_id
      }
    });
    const quoteReasoningResponse = parseTextJson<ReasoningLogEntry>(quoteReasoningResult);

    console.log("\nquote reasoning log response:");
    console.log(JSON.stringify(quoteReasoningResponse, null, 2));
  } finally {
    await client.close();
  }
}

function assertToolRegistered(toolNames: string[], requiredToolName: string): void {
  if (!toolNames.includes(requiredToolName)) {
    throw new Error(`Required MCP tool is not registered: ${requiredToolName}`);
  }
}

function parseTextJson<T>(toolResult: unknown): T {
  if (!isRecord(toolResult) || !Array.isArray(toolResult.content)) {
    throw new Error("MCP tool response did not include text JSON content");
  }

  const firstContent = toolResult.content[0];

  if (!isRecord(firstContent) || firstContent.type !== "text" || typeof firstContent.text !== "string") {
    throw new Error("MCP tool response did not include text JSON content");
  }

  try {
    return JSON.parse(firstContent.text) as T;
  } catch {
    throw new Error(`MCP tool returned non-JSON text: ${firstContent.text}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

runMockMcpCustomerAgent().catch((error) => {
  console.error("MCP customer agent demo failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
