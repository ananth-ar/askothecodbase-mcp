// import { startWeatherServer } from "./src/weather-server.ts";
import { main } from "./src/opencode-edit.ts";

// // Start the MCP server over stdio. Avoid stdout logs to prevent protocol corruption.
// startWeatherServer().catch((error) => {
//   console.error("Fatal error in startWeatherServer():", error);
//   process.exit(1);
// });
main().catch((err) => {
  console.error("SDK edit demo failed:", err);
  process.exit(1);
});
