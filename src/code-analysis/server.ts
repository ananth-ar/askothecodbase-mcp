import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  askOtherCodebase,
  askOtherCodebaseParamsSchema,
} from "./ask-other-codebase.ts";

export function createCodeAnalysisServer(): McpServer {
  const server = new McpServer({
    name: "code-analysis-mcp",
    version: "1.0.0",
    capabilities: { tools: {}, resources: {} },
  });

  server.tool(
    "ask-other-codebase",
    "Retrieve architecture, API insights, code snippets and other information from another codebase",
    askOtherCodebaseParamsSchema,
    async ({
      projectPath,
      question,
    }: {
      projectPath: string;
      question: string;
    }) => {
      const result = await askOtherCodebase({ projectPath, question });
      return {
        content: [
          { type: "text" as const, text: result.answer },
          {
            type: "json" as const,
            json: {
              projectRoot: result.projectRoot,
              sessionId: result.sessionId,
              createdAgents: result.createdAgents,
              createdConfig: result.createdConfig,
            },
          },
        ],
      };
    }
  );

  return server;
}

export async function startCodeAnalysisServer(): Promise<void> {
  const server = createCodeAnalysisServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    "Code analysis MCP server is running on stdio. Use the ask-other-codebase tool for deep repository questions."
  );
}
