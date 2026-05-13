import type { BasicMcpServer } from "./mcpServer.js";
import { getReasoningTool } from "./tools/getReasoning.tool.js";
import { verifyIdentityTool } from "./tools/verifyIdentity.tool.js";

export function registerTools(server: BasicMcpServer): void {
  server.registerTool(verifyIdentityTool);
  server.registerTool(getReasoningTool);
}
