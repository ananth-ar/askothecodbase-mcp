# Repository Guidelines

## Project Structure & Module Organization
- Entry point: `index.ts` at the repo root (Bun/ESM).
- Prefer new source files under `src/` (e.g., `src/utils/format.ts`).
- Tests live in `tests/` or co‑located as `*.test.ts` next to the unit under test.
- Place static assets in `assets/` and import via ESM URLs.

## Build, Test, and Development Commands
- `bun install` — install dependencies (uses `bun.lock`).
- `bun run index.ts` — run the main program locally.
- `bun test` — run the test suite; add `--watch` to iterate.
- `bun test --coverage` — generate coverage output in `coverage/`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict mode; ESM). Use 2‑space indentation.
- Filenames: `kebab-case.ts` for modules, `PascalCase.tsx` for React components (if added).
- Identifiers: `camelCase` for variables/functions, `PascalCase` for classes/types.
- Prefer `const`, narrow types, and explicit return types for exported APIs.
- Keep modules small and focused; avoid side effects at import time.

## Testing Guidelines
- Framework: Bun test runner (built‑in). Example: `tests/math.test.ts`.
- Name tests `*.test.ts`; mirror the source path (e.g., `src/math.ts` → `tests/math.test.ts`).
- Aim for meaningful unit tests over broad integration where possible.
- Target high coverage on critical paths; include edge cases and error handling.

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
- Make minimal, focused changes consistent with existing patterns.
- Use Bun commands for scripts and tests; do not switch package managers.
- When adding behavior, include tests and brief docs/examples.

