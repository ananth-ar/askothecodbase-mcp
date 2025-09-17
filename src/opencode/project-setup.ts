import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

export interface EnsureProjectSetupResult {
  projectRoot: string;
  agentsPath: string;
  configPath: string;
  createdAgents: boolean;
  createdConfig: boolean;
}

const DEFAULT_AGENTS_CONTENT = `# Code Analysis Agent

This project is prepared for read-only architectural analysis.

## Expectations

- Answer deep questions about APIs, data flow, and module relationships.
- Cite relevant paths (e.g. "src/users/service.ts") when referencing code.
- Do **not** plan or attempt file edits, commits, or command execution.
- When code snippets or type definitions are requested, include the full, exact structures instead of placeholders.
- Capture notable context (key paths, models, assumptions) so downstream tools can reuse it.
- Prefer structured walkthroughs over high-level summaries when explaining systems.

## Tips for Investigations

- Skim entry points and dependency graphs before diving into details.
- Cross-reference docs, tests, and implementations to confirm behaviour.
- Flag unclear areas and suggest follow-up questions instead of guessing.
`;

const DEFAULT_CONFIG = {
  $schema: "https://opencode.ai/config.json",
  instructions: ["AGENTS.md", "opencode.json"],
  permission: {
    edit: "deny",
    bash: {
      ls: "allow",
      "ls *": "allow",
      pwd: "allow",
      "find *": "allow",
      "fd *": "allow",
      "rg *": "allow",
      "grep *": "allow",
      "egrep *": "allow",
      "fgrep *": "allow",
      "cat *": "allow",
      "head *": "allow",
      "tail *": "allow",
      "wc *": "allow",
      "stat *": "allow",
      "tree *": "allow",
      "git status": "allow",
      "git diff": "allow",
      "git show *": "allow",
      "git log *": "allow",
      "*": "deny",
    },
  },
  agent: {
    "code-analysis": {
      description:
        "Read-only expert that maps architecture, APIs, and critical flows for this repository.",
      mode: "primary",
      model: "anthropic/claude-sonnet-4-20250514",
      tools: {
        write: false,
        edit: false,
        bash: true,
        read: true,
        list: true,
        glob: true,
        grep: true,
      },
    },
  },
};

async function pathStats(target: string) {
  try {
    return await fs.stat(target);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err && err.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureProjectSetup(
  inputPath: string
): Promise<EnsureProjectSetupResult> {
  if (!inputPath) {
    throw new Error("Project path is required");
  }

  const resolved = path.resolve(inputPath);
  const stats = await pathStats(resolved);
  if (!stats) {
    throw new Error(`Project path does not exist: ${resolved}`);
  }

  const projectRoot = stats.isDirectory()
    ? resolved
    : path.dirname(resolved);

  const agentsPath = path.join(projectRoot, "AGENTS.md");
  const configPath = path.join(projectRoot, "opencode.json");

  let createdAgents = false;
  let createdConfig = false;

  if (!(await fileExists(agentsPath))) {
    await fs.writeFile(agentsPath, DEFAULT_AGENTS_CONTENT, "utf8");
    createdAgents = true;
  }

  if (!(await fileExists(configPath))) {
    const serialized = `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`;
    await fs.writeFile(configPath, serialized, "utf8");
    createdConfig = true;
  }

  return {
    projectRoot,
    agentsPath,
    configPath,
    createdAgents,
    createdConfig,
  };
}
