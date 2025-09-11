import { startWeatherServer } from "./src/weather-server.ts";

// Start the MCP server over stdio. Avoid stdout logs to prevent protocol corruption.
startWeatherServer().catch((error) => {
  console.error("Fatal error in startWeatherServer():", error);
  process.exit(1);
});
