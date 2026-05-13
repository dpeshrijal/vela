import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { appConfig } from "../app/config.js";
import { getIdentityResultToolName } from "./tools/getIdentityResult.tool.js";
import { getReasoningTool } from "./tools/getReasoning.tool.js";
import { verifyIdentityToolName } from "./tools/verifyIdentity.tool.js";
import { getReasoningToolName } from "./tools/getReasoning.tool.js";
import { getIdentityResult, verifyIdentity } from "../orchestration/identity/identityOrchestrator.js";

export function createOfficialMcpServer(agentToken: string): McpServer {
  const server = new McpServer({
    name: appConfig.appName,
    version: "0.1.0"
  });

  server.registerTool(
    verifyIdentityToolName,
    {
      description: "Verify identity through mock KYC orchestration.",
      inputSchema: {
        external_user_id: z.string(),
        jurisdiction: z.string(),
        document_type: z.enum(["passport", "drivers_license", "national_id"]),
        document_front: z.string(),
        selfie_or_liveness_session_id: z.string(),
        idempotency_key: z.string()
      }
    },
    async (payload) => {
      const result = await verifyIdentity({
        agentToken,
        payload
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    getIdentityResultToolName,
    {
      description: "Fetch the latest identity verification result from the selected KYC vendor.",
      inputSchema: {
        verification_id: z.string()
      }
    },
    async ({ verification_id }) => {
      const result = await getIdentityResult({
        agentToken,
        verificationId: verification_id
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    getReasoningToolName,
    {
      description: "Retrieve a stored reasoning log by ID.",
      inputSchema: {
        reasoning_log_id: z.string()
      }
    },
    async ({ reasoning_log_id }) => {
      const result = await getReasoningTool.handler({
        agent_token: agentToken,
        reasoning_log_id
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  return server;
}
