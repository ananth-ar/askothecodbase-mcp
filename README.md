# Code Analysis MCP

## Overview
Code Analysis MCP is a Bun-based Model Context Protocol (MCP) server that wraps the opencode SDK to deliver deep, read-only codebase investigations. The entry point in `index.ts:1` boots a server that exposes a single `ask-other-codebase` tool capable of answering architecture, API, and flow questions about local projects or remote Git repositories without mutating any files.

## Key Features
- Read-only MCP server registered in `src/mcp.ts:9` with metadata and stdio transport.
- `ask-other-codebase` tool in `src/mcp.ts:16` surfaces a consistent question/answer API for arbitrary codebases.
- Automatic project preparation that ensures `AGENTS.md` and `opencode.json` exist for every inspected repository (`src/opencode/project-setup.ts:186`).
- Optional Git cloning support when the tool receives a remote URL (`src/opencode/project-setup.ts:165`).
- Automatic opencode server management with reuse of an existing instance when `OPENCODE_BASE_URL` is reachable (`src/opencode/server.ts:19`).
- Resilient prompt execution with retry logic for rate limits and fallbacks for missing assistant responses (`src/opencode/ask-other-codebase.ts:61`).


## Tool API: `ask-other-codebase`
- **Input schema** (`src/opencode/ask-other-codebase.ts:28`):
  ```ts
  {
    projectPath: string; // Local path or Git URL
    question: string;    // Architecture, API, or implementation question
  }
  ```
- **Response shape** (`src/mcp.ts:24`, `src/opencode/ask-other-codebase.ts:168`):
  ```ts
  {
    answer: string;
    projectRoot: string;
    sessionId: string;
    createdAgents: boolean;
    createdConfig: boolean;
    clonedFromGit?: boolean;
    gitUrl?: string;
  }
  ```
- **Behaviour highlights**:
  - Retries prompt execution up to three times for overload or rate-limit errors (`src/opencode/ask-other-codebase.ts:61`).
  - Falls back to session message polling when the immediate prompt response lacks text (`src/opencode/ask-other-codebase.ts:179`).
  - Appends setup metadata (e.g., cloning notes) ahead of the assistant answer (`src/opencode/ask-other-codebase.ts:147`).

## Project Layout
```
.
├── index.ts
├── src/
│   ├── mcp.ts
│   └── opencode/
│       ├── ask-other-codebase.ts
│       ├── opencode-client.ts
│       ├── project-setup.ts
│       └── server.ts
├── docs/
├── AGENTS.md
├── opencode.json
├── package.json
├── bun.lock
└── tsconfig.json
```

## Prerequisites
- [Bun](https://bun.sh) 1.0 or newer.
- Git for cloning remote repositories inside `ensureProjectSetup()`.
- Either an accessible opencode server or permission to spawn a local instance (see `src/opencode/server.ts:19`).

## Setup
1. Install dependencies:
   ```bash
   bun install
   ```
2. Optionally set `OPENCODE_BASE_URL` to reuse an existing opencode server. When undefined or unreachable, the project will launch a local instance on ports 4096, 4097, or a random available port.

## Build
Generate an optimized bundle under `build/` when you need a single-file entry point:
```bash
bun run build
```
The script in `package.json` uses Bun's bundler to emit `build/index.js`, which mirrors the behaviour of `index.ts` and keeps the server runnable entirely on your local machine.

## Environment & API Keys
Create a `.env.local` file (ignored by Git) so Bun loads your secrets before the server starts:
```bash
ANTHROPIC_API_KEY=sk-ant-...
# Optional: reuse an existing opencode deployment instead of spawning one
OPENCODE_BASE_URL=http://127.0.0.1:4096
```
- `ANTHROPIC_API_KEY` powers the default `anthropic/claude-sonnet-4-20250514` model defined in `opencode.json`.
- Leave `OPENCODE_BASE_URL` unset to let `ensureServer()` (`src/opencode/server.ts:18`) start a local opencode server automatically.


## Running Locally
Start the MCP server in stdio mode:
```bash
bun run index.ts
```
The process logs readiness to stderr (`src/mcp.ts:49`). Connect your MCP-compatible client to the stdio transport.

## Local MCP Client Setup
Launch the server (`bun run index.ts`) in a terminal, then configure your preferred MCP client to attach via stdio. 

- **Claude Desktop** (edit `claude_desktop_config.json`, typically under `%APPDATA%/Claude/` on Windows or `~/Library/Application Support/Claude/` on macOS):
  ```json
  {
    "mcpServers": {
      "code-analysis": {
        "command": "bun",
        "args": ["run", "index.ts"],
        "cwd": "D:/project_mcp",
        "env": {
          "ANTHROPIC_API_KEY": "sk-ant-...",
          "OPENCODE_BASE_URL": "http://127.0.0.1:4096"
        }
      }
    }
  }
  ```

- **Cursor IDE** (update `%APPDATA%/Cursor/mcp.json` or `~/Library/Application Support/Cursor/mcp.json`):
  ```json
  "code-analysis": {
    "command": "bun",
    "args": ["run", "index.ts"],
    "cwd": "D:/project_mcp",
    "autoRestart": true,
    "env": {
      "ANTHROPIC_API_KEY": "sk-ant-..."
    }
  }
  ```


## Using the MCP Tool
1. Connect your MCP client to the running process.
2. Invoke `ask-other-codebase` with a payload such as:
   ```json
   {
     "projectPath": "/path/to/repo-or-file",
     "question": "Explain how HTTP requests are validated before reaching the controller"
   }
   ```
3. For remote repositories, supply the Git URL (HTTPS or SSH). The tool clones it into the OS temporary directory (`src/opencode/project-setup.ts:165`).
4. Review the textual analysis and metadata JSON, including the `sessionId` for follow-up queries.

## Configuration
- `OPENCODE_BASE_URL`: points to a pre-existing opencode server (`src/opencode/server.ts:23`).
- `.env.local`: optional file for local configuration; `.env*` patterns stay untracked.
- Default permissions: generated `opencode.json` denies write/edit capabilities and whitelists a small set of read-only shell commands (`src/opencode/project-setup.ts:40`).
- Default modal is claude-sonnet-4, change it in opencode.json for any other model.
