import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { appConfig } from "../app/config.js";
import { getIdentityResultToolName } from "./tools/getIdentityResult.tool.js";
import { getLiquidityQuoteToolName } from "./tools/getLiquidityQuote.tool.js";
import { getReasoningTool } from "./tools/getReasoning.tool.js";
import { verifyIdentityToolName } from "./tools/verifyIdentity.tool.js";
import { getReasoningToolName } from "./tools/getReasoning.tool.js";
import { getIdentityResult, verifyIdentity } from "../orchestration/identity/identityOrchestrator.js";
import { getLiquidityQuote } from "../orchestration/liquidity/liquidityOrchestrator.js";

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
        idempotency_key: z.string(),
        document_type: z.enum(["passport", "drivers_license", "national_id"]).optional(),
        document_front: z.string().optional(),
        selfie_or_liveness_session_id: z.string().optional()
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
    getLiquidityQuoteToolName,
    {
      description: "Create a real liquidity quote through Conduit.",
      inputSchema: {
        source_asset: z.string(),
        source_amount: z.string(),
        target_asset: z.string(),
        target_network: z.string(),
        idempotency_key: z.string()
      }
    },
    async (payload) => {
      const result = await getLiquidityQuote({
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
