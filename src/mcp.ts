import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  askOtherCodebase,
  askOtherCodebaseParamsSchema,
} from "./opencode/ask-other-codebase.ts";

export function createCodeAnalysisServer(): McpServer {
  const server = new McpServer({
    name: "code-analysis-mcp",
    version: "1.0.0",
    capabilities: { tools: {}, resources: {} },
  });

  server.registerTool(
    "ask-other-codebase",
    {
      description:
        "Retrieve architecture, API insights, code snippets and other information from another codebase. Supports both local file paths and Git repository URLs (GitHub, GitLab, Bitbucket, etc.)",
      inputSchema: askOtherCodebaseParamsSchema.shape,
    },
    async ({ projectPath, question }) => {
      const result = await askOtherCodebase({ projectPath, question });
      const meta = {
        projectRoot: result.projectRoot,
        sessionId: result.sessionId,
        createdAgents: result.createdAgents,
        createdConfig: result.createdConfig,
        clonedFromGit: result.clonedFromGit,
        gitUrl: result.gitUrl,
      };
      return {
        content: [
          { type: "text", text: result.answer },
          { type: "text", text: JSON.stringify(meta, null, 2) },
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
