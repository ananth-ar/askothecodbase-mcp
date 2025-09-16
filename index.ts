import { startCodeAnalysisServer } from "./src/code-analysis/server.ts";

startCodeAnalysisServer().catch((error) => {
  console.error("Failed to start code analysis MCP server:", error);
  process.exit(1);
});
