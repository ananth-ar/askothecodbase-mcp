# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Install dependencies:**
```bash
bun install
```

**Run the MCP server (stdio):**
```bash
bun run index.ts
```

**Run tests:**
```bash
bun test
# With coverage
bun test --coverage
```

**Run the opencode SDK demo:**
```bash
# Option A: Connect to existing opencode server
export OPENCODE_BASE_URL=http://127.0.0.1:4096  # or set in PowerShell
bun run src/opencode-edit.ts README.md "Append the line: \"Edited by opencode SDK demo\""

# Option B: Let script start local server
bun run src/opencode-edit.ts README.md "Append the line: \"Edited by opencode SDK demo\""
```

## Architecture

This is a dual-purpose repository containing:

1. **MCP Weather Server** - A Model Context Protocol server that provides weather data via the US National Weather Service API
2. **OpenCode SDK Demo** - Example implementation showing how to use the OpenCode JavaScript SDK for automated code editing

### MCP Weather Server (`src/weather-server.ts`)
- Implements MCP server using `@modelcontextprotocol/sdk`
- Provides two tools:
  - `get_alerts(state: string)` - Get weather alerts for a US state (2-letter code)
  - `get_forecast(latitude: number, longitude: number)` - Get forecast for US coordinates
- Uses stdio transport for communication with MCP clients like Claude Desktop
- All logging goes to stderr (never stdout) to avoid corrupting stdio transport
- Main entry point: `index.ts` (currently missing, should call `startWeatherServer()`)

### OpenCode SDK Demo (`src/opencode-edit.ts`)
- Demonstrates automated code editing using `@opencode-ai/sdk`
- Can connect to existing opencode server or start its own local server
- Default model: `openai/gpt-5`
- Handles authentication and session management
- Example of programmatic file editing workflows

## Key Technical Notes

- **Runtime:** Bun with TypeScript/ESM
- **MCP Protocol:** Uses stdio transport - never use `console.log` in MCP server code
- **Validation:** Uses Zod for input validation
- **Testing:** Bun test framework with coverage support
- **Weather API:** US National Weather Service (requires US coordinates/state codes)
- **OpenCode:** Requires authentication via `opencode auth login` or environment variables

## File Structure

- `index.ts` - MCP server entry point (currently missing)
- `src/weather-server.ts` - MCP server implementation and weather tools
- `src/opencode-edit.ts` - OpenCode SDK demonstration
- `tests/weather-server.test.ts` - Unit tests for weather server
- `tsconfig.json` - TypeScript configuration with strict settings