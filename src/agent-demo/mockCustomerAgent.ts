import "dotenv/config";
import { appConfig } from "../app/config.js";
import type { ReasoningLogEntry } from "../audit/reasoningLog.types.js";
import { createMcpServer } from "../mcp/mcpServer.js";
import { getReasoningToolName } from "../mcp/tools/getReasoning.tool.js";
import { verifyIdentityToolName } from "../mcp/tools/verifyIdentity.tool.js";
import type {
  VerifyIdentityRequest,
  VerifyIdentityResponse
} from "../orchestration/identity/identity.types.js";

const demoPayloads: Array<{ label: string; payload: VerifyIdentityRequest }> = [
  {
    label: "approved: valid document and liveness passed",
    payload: {
      external_user_id: "user_approved_123",
      jurisdiction: "US",
      document_type: "passport",
      document_front: "mock_valid_document",
      selfie_or_liveness_session_id: "live_passed",
      idempotency_key: "request_approved_123"
    }
  },
  {
    label: "rejected: failed liveness",
    payload: {
      external_user_id: "user_rejected_123",
      jurisdiction: "US",
      document_type: "passport",
      document_front: "mock_valid_document",
      selfie_or_liveness_session_id: "live_failed",
      idempotency_key: "request_rejected_123"
    }
  },
  {
    label: "review: unclear document",
    payload: {
      external_user_id: "user_review_123",
      jurisdiction: "US",
      document_type: "passport",
      document_front: "mock_unclear_document",
      selfie_or_liveness_session_id: "live_passed",
      idempotency_key: "request_review_123"
    }
  }
];

export async function runMockCustomerAgent(): Promise<void> {
  const mcpServer = createMcpServer();

  for (const demo of demoPayloads) {
    const response = await mcpServer.callTool<VerifyIdentityResponse>(verifyIdentityToolName, {
      agent_token: appConfig.demoAgentToken,
      payload: demo.payload
    });

    console.log(`\n${demo.label}`);
    console.log("verification response:");
    console.log(JSON.stringify(response, null, 2));

    const reasoningLog = await mcpServer.callTool<ReasoningLogEntry>(getReasoningToolName, {
      agent_token: appConfig.demoAgentToken,
      reasoning_log_id: response.reasoning_log_id
    });

    console.log("reasoning log response:");
    console.log(JSON.stringify(reasoningLog, null, 2));
  }
}

await runMockCustomerAgent();
