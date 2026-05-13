import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { appConfig } from "./config.js";
import { VelaError } from "../common/errors.js";
import { createMcpServer } from "../mcp/mcpServer.js";
import { getReasoningToolName } from "../mcp/tools/getReasoning.tool.js";
import { verifyIdentityToolName } from "../mcp/tools/verifyIdentity.tool.js";

export function startServer(): void {
  const port = Number(process.env.PORT ?? 3000);
  const mcpServer = createMcpServer();

  const httpServer = createServer(async (request, response) => {
    try {
      await handleRequest(request, response, mcpServer);
    } catch (error) {
      const statusCode = error instanceof VelaError ? 400 : 500;
      const message = error instanceof Error ? error.message : "Unknown server error";

      sendJson(response, statusCode, {
        error: message
      });
    }
  });

  httpServer.listen(port, () => {
    console.log(`${appConfig.appName} HTTP server ready on port ${port}`);
    console.log(`Registered MCP tools: ${mcpServer.listTools().join(", ")}`);
  });
}

startServer();

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  mcpServer: ReturnType<typeof createMcpServer>
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: appConfig.appName
    });
    return;
  }

  if (request.method === "POST" && url.pathname === `/tools/${verifyIdentityToolName}`) {
    const payload = await readJsonBody(request);
    const result = await mcpServer.callTool(verifyIdentityToolName, {
      agent_token: getAgentToken(request),
      payload
    });

    sendJson(response, 200, result);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/audit/")) {
    const reasoningLogId = decodeURIComponent(url.pathname.replace("/audit/", ""));

    if (reasoningLogId.length === 0) {
      throw new VelaError("Missing reasoning_log_id");
    }

    const result = await mcpServer.callTool(getReasoningToolName, {
      agent_token: getAgentToken(request),
      reasoning_log_id: reasoningLogId
    });

    sendJson(response, 200, result);
    return;
  }

  sendJson(response, 404, {
    error: "Route not found"
  });
}

function getAgentToken(request: IncomingMessage): string {
  const token = request.headers["x-agent-token"];

  if (typeof token === "string") {
    return token;
  }

  if (Array.isArray(token)) {
    return token[0] ?? "";
  }

  return "";
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (rawBody.length === 0) {
    throw new VelaError("Request body must be valid JSON");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new VelaError("Request body must be valid JSON");
  }
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json"
  });
  response.end(JSON.stringify(body, null, 2));
}
