import { startCodeAnalysisServer } from "./src/mcp.ts";

startCodeAnalysisServer().catch((error) => {
  console.error("Failed to start code analysis MCP server:", error);
  process.exit(1);
});
