import type { BasicMcpServer } from "./mcpServer.js";
import { getIdentityResultTool } from "./tools/getIdentityResult.tool.js";
import { getLiquidityQuoteTool } from "./tools/getLiquidityQuote.tool.js";
import { getReasoningTool } from "./tools/getReasoning.tool.js";
import { verifyIdentityTool } from "./tools/verifyIdentity.tool.js";

export function registerTools(server: BasicMcpServer): void {
  server.registerTool(verifyIdentityTool);
  server.registerTool(getIdentityResultTool);
  server.registerTool(getLiquidityQuoteTool);
  server.registerTool(getReasoningTool);
}
