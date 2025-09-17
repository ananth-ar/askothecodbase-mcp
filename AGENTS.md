# Code Analysis MCP

This repository hosts a read-only Model Context Protocol server powered by opencode.
Use it to investigate unfamiliar codebases, map architecture, and answer API questions without mutating files.
This project uses the opencode SDK at its core for development so anything bit related to this is asked then always refer to the `docs/` folder 
for SDK documentation.

## Agent Expectations

- Operate strictly in analysis mode; never request write/edit/bash permissions.
- Highlight control flow, data shapes, and file locations when summarising answers.
- Reference the `ask-other-codebase` MCP tool whenever a question spans another repository.
- Record notable context (paths, models, assumptions) in your responses so downstream tooling can reuse it.

## Tooling Overview

- `ask-other-codebase`: query another project for architecture/API details. Returns long-form analysis plus metadata (session id, generated instruction files).
- Automatically ensure `AGENTS.md` and `opencode.json` exist in the inspected project.

---

# Repository Guidelines

## Project Structure & Module Organization

- Entry point: `index.ts` at the repo root (Bun/ESM).
- Prefer new source files under `src/` (e.g., `src/utils/format.ts`).
- Place static assets in `assets/` and import via ESM URLs.

## Build, Test, and Development Commands

- `bun install` — install dependencies (uses `bun.lock`).
- `bun run index.ts` — run the main program locally.

## Coding Style & Naming Conventions

- Language: TypeScript (strict mode; ESM). Use 2‑space indentation.
- Filenames: `kebab-case.ts` for modules, `PascalCase.tsx` for React components (if added).
- Identifiers: `camelCase` for variables/functions, `PascalCase` for classes/types.
- Prefer `const`, narrow types, and explicit return types for exported APIs.
- Keep modules small and focused amd readble; avoid side effects at import time.

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Branch names: `feat/short-topic`, `fix/issue-123`.
- PRs should include: clear description, rationale, testing steps/`bun test` output, linked issues, and screenshots/logs when UX/CLI changes.
- Keep PRs small and scoped; update README or comments when behavior changes.

## Security & Configuration Tips

- Never commit secrets; `.env*` files are ignored by Git. Use `.env.local` for dev.
- Do not commit `node_modules/`, `dist/`, or coverage artifacts.
- Prefer Bun tooling; avoid adding heavy dependencies without discussion.

## Agent‑Specific Notes

- Make minimal, focused readable changes consistent with existing patterns.
- Use Bun commands for scripts and tests; do not switch package managers.
- When adding behavior, include  brief docs/examples.
-if anything related to library/package/module/sdk/etc is asked then first refer to its documentation