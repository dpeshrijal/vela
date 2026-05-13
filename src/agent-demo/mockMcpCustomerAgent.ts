import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { appConfig } from "../app/config.js";
import { getReasoningToolName } from "../mcp/tools/getReasoning.tool.js";
import { verifyIdentityToolName } from "../mcp/tools/verifyIdentity.tool.js";
import type { VerifyIdentityRequest, VerifyIdentityResponse } from "../orchestration/identity/identity.types.js";
import type { ReasoningLogEntry } from "../audit/reasoningLog.types.js";

const mcpServerUrl = process.env.MCP_SERVER_URL ?? "http://localhost:3000/mcp";

const validPayload: VerifyIdentityRequest = {
  external_user_id: "user_mcp_approved_123",
  jurisdiction: "US",
  document_type: "passport",
  document_front: "mock_valid_document",
  selfie_or_liveness_session_id: "live_passed",
  idempotency_key: "request_mcp_approved_123"
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

    const reasoningResult = await client.callTool({
      name: getReasoningToolName,
      arguments: {
        reasoning_log_id: verificationResponse.reasoning_log_id
      }
    });
    const reasoningResponse = parseTextJson<ReasoningLogEntry>(reasoningResult);

    console.log("\nreasoning log response:");
    console.log(JSON.stringify(reasoningResponse, null, 2));
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

  return JSON.parse(firstContent.text) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

runMockMcpCustomerAgent().catch((error) => {
  console.error("MCP customer agent demo failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
