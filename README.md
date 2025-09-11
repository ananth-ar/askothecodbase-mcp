# MCP Weather Server (Bun/TypeScript)

This repository implements an end-to-end MCP server that provides weather alerts and forecasts using the US National Weather Service (NWS) API. It runs over stdio and follows best practices for MCP logging.

Notes for STDIO servers: never write to stdout from your own code (no `console.log`). This project logs only to stderr via `console.error`.

## Install

```bash
bun install
```

## Run (stdio)

```bash
bun run index.ts
```

You should see a stderr log: `Weather MCP Server running on stdio`.

## SDK Code Edit Demo (opencode)

A minimal example using the opencode JavaScript SDK to request a basic code edit is included at `src/opencode-edit.ts`.

Prereqs:
- opencode installed/configured locally (TUI or server)
- A model/provider configured in opencode (API keys env/config)

Install dependency:

```bash
bun install
```

Option A — connect to an existing opencode server (recommended):

```bash
# Start your server separately (e.g.)
opencode serve --hostname 127.0.0.1 --port 4096

# Point the script at it
$env:OPENCODE_BASE_URL = "http://127.0.0.1:4096"   # PowerShell
# export OPENCODE_BASE_URL=http://127.0.0.1:4096     # bash/zsh

# Run: edit README.md by appending a line
bun run src/opencode-edit.ts README.md "Append the line: \"Edited by opencode SDK demo\""
```

Option B — let the script start a local server for you:

```bash
# The script will start a server at 127.0.0.1:4096 with edit permission allowed
bun run src/opencode-edit.ts README.md "Append the line: \"Edited by opencode SDK demo\""
```

Notes:
- The script creates a session, sends a prompt requesting a minimal edit, and prints a short summary. It also reads the file after to show the first 400 chars.
- If a model is configured in your opencode config, it will be used. Otherwise, the server default applies.
- Set `OPENCODE_BASE_URL` to reuse an already-running server.

## Use with Claude Desktop (example)

Add a server entry to your Claude Desktop MCP config (adapt paths as needed):

```json
{
  "mcpServers": {
    "weather": {
      "command": "bun",
      "args": ["run", "index.ts"],
      "transport": "stdio"
    }
  }
}
```

Tools exposed:
- `get_alerts(state: string)` — state is a 2-letter code (e.g., CA, NY)
- `get_forecast(latitude: number, longitude: number)` — coordinates within the US

## Test

```bash
bun test
# or with coverage
bun test --coverage
```

## Project structure

- `index.ts` — entry point; starts the MCP server over stdio
- `src/weather-server.ts` — server setup, tools, and helpers
- `tests/weather-server.test.ts` — minimal unit tests

## Tech

- Runtime: Bun (ESM, TypeScript)
- MCP SDK: `@modelcontextprotocol/sdk`
- Validation: `zod`
