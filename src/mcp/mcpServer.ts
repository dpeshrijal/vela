import { registerTools } from "./registerTools.js";

export type McpToolHandler<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export interface McpToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  handler: McpToolHandler<TInput, TOutput>;
}

export interface BasicMcpServer {
  registerTool<TInput, TOutput>(tool: McpToolDefinition<TInput, TOutput>): void;
  callTool<TOutput>(name: string, input: unknown): Promise<TOutput>;
  listTools(): string[];
}

export function createMcpServer(): BasicMcpServer {
  const tools = new Map<string, McpToolDefinition<unknown, unknown>>();

  const server: BasicMcpServer = {
    registerTool(tool) {
      tools.set(tool.name, tool as McpToolDefinition<unknown, unknown>);
    },

    async callTool<TOutput>(name: string, input: unknown): Promise<TOutput> {
      const tool = tools.get(name);

      if (!tool) {
        throw new Error(`MCP tool is not registered: ${name}`);
      }

      return tool.handler(input) as Promise<TOutput>;
    },

    listTools() {
      return [...tools.keys()];
    }
  };

  registerTools(server);

  return server;
}
