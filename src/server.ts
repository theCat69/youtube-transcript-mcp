import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "youtube-transcript",
    version: "1.0.0",
  });

  // Hello world tool — placeholder for development
  server.registerTool(
    "hello",
    {
      description: "A simple hello world tool for testing",
      inputSchema: { name: z.string().max(256).describe("Name to greet") },
    },
    async ({ name }) => ({
      content: [{ type: "text" as const, text: `Hello, ${name}!` }],
    }),
  );

  return server;
}
