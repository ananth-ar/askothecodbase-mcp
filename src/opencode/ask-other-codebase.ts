import path from "node:path";
import { z } from "zod";
import { createAnalysisClient } from "./opencode-client.ts";
import { ensureProjectSetup } from "./project-setup.ts";

export type SdkResult<T> =
  | ({ data: T; error: undefined } & { request?: unknown; response?: unknown })
  | ({ data: undefined; error: any } & {
      request?: unknown;
      response?: unknown;
    });

export function unwrap(res: SdkResult<any>) {
  const r = res;
  if (r && typeof r === "object" && ("data" in r || "error" in r)) {
    if (r.error) {
      const msg =
        typeof r.error?.message === "string"
          ? r.error.message
          : "SDK request failed";
      throw new Error(msg);
    }
    return r.data;
  }
  return res;
}

export const askOtherCodebaseParamsSchema = z.object({
  projectPath: z.string().min(1).describe("Local file path or Git repository URL (GitHub, GitLab, Bitbucket, etc.)"),
  question: z.string().min(1).describe("Question about the codebase architecture, APIs, or implementation details"),
});

export type AskOtherCodebaseParams = z.infer<
  typeof askOtherCodebaseParamsSchema
>;

export interface AskOtherCodebaseResult {
  projectRoot: string;
  sessionId: string;
  answer: string;
  createdAgents: boolean;
  createdConfig: boolean;
  clonedFromGit?: boolean;
  gitUrl?: string;
}

function collectText(parts: unknown): string[] {
  if (!Array.isArray(parts)) return [];
  const texts: string[] = [];
  for (const part of parts) {
    if (part && typeof part === "object" && (part as any).type === "text") {
      const text = (part as any).text;
      if (typeof text === "string" && text.trim().length > 0) {
        texts.push(text);
      }
    }
  }
  return texts;
}

async function sendAnalysisPrompt(options: {
  client: any;
  sessionId: string;
  projectRoot: string;
  question: string;
  maxRetries?: number;
}) {
  const { client, sessionId, projectRoot, question, maxRetries = 3 } = options;
  let attempt = 0;
  let last: any = null;
  while (attempt < maxRetries) {
    const messageSections = [
      "You are a senior code-analysis expert working in a read-only mode.",
      "Repository root: " + projectRoot,
      "Study the existing implementation to answer the user question with precise references.",
      "Do not propose file edits, commit commands, or speculative changes.",
      "Cite relative file paths and explain the flow of control when relevant.",
      "Question: " + question,
    ];
    const message = messageSections.join("\n\n");
    const res = await client.session.prompt({
      path: { id: sessionId },
      query: { directory: projectRoot },
      body: {
        agent: "plan",
        parts: [{ type: "text", text: message }],
      },
    });
    let payload: any;
    try {
      payload = unwrap(res);
      if (!(payload && payload.info && payload.info.error)) {
        return payload;
      }
    } catch (error) {
      payload = { info: { error } };
    }
    last = payload;
    const err = payload?.info?.error;
    const raw = (err?.message && String(err.message)) || String(err || "");
    const normalized = raw.toLowerCase();
    if (normalized.includes("overload") || normalized.includes("rate limit")) {
      const waitMs = Math.min(10000, 2000 * Math.pow(2, attempt));
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt += 1;
      continue;
    }
    return payload;
  }
  return last;
}

export async function askOtherCodebase(
  params: AskOtherCodebaseParams
): Promise<AskOtherCodebaseResult> {
  const { projectPath, question } = params;
  const setup = await ensureProjectSetup(projectPath);
  const client = await createAnalysisClient();
  const sessionRes = await client.session.create({
    body: {
      title: "Code analysis for " + path.basename(setup.projectRoot),
    },
    query: { directory: setup.projectRoot },
  });
  const session = unwrap(sessionRes);
  const sessionId = session?.id;
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("Failed to create opencode session");
  }

  const result = await sendAnalysisPrompt({
    client,
    sessionId,
    projectRoot: setup.projectRoot,
    question,
  });

  let texts = collectText(result?.parts);
  if (!texts.length) {
    const fallback = await tryFetchAssistantMessage({ client, sessionId });
    texts = collectText(fallback?.parts);
  }
  if (!texts.length) {
    throw new Error("The analysis agent returned no text response");
  }

  const summarySegments: string[] = [];

  // Add Git cloning information if applicable
  if (setup.clonedFromGit && setup.gitUrl) {
    summarySegments.push(
      `Cloned repository from ${setup.gitUrl} to ${setup.projectRoot}.`
    );
  }

  // Add setup information
  if (setup.createdAgents || setup.createdConfig) {
    const created: string[] = [];
    if (setup.createdAgents) created.push("AGENTS.md");
    if (setup.createdConfig) created.push("opencode.json");
    summarySegments.push(
      "Initialized " + created.join(" and ") + " in " + setup.projectRoot + "."
    );
  }

  summarySegments.push(texts.join("\n\n"));

  return {
    projectRoot: setup.projectRoot,
    sessionId,
    answer: summarySegments.join("\n\n"),
    createdAgents: setup.createdAgents,
    createdConfig: setup.createdConfig,
    clonedFromGit: setup.clonedFromGit,
    gitUrl: setup.gitUrl,
  };
}

export async function tryFetchAssistantMessage(params: {
  client: any;
  sessionId: string;
  retries?: number;
  delayMs?: number;
}) {
  const { client, sessionId, retries = 10, delayMs = 1000 } = params;
  for (let i = 0; i < retries; i++) {
    try {
      const messagesRes = await client.session.messages({
        path: { id: sessionId },
      });
      const messages = unwrap(messagesRes);
      const assistants = Array.isArray(messages)
        ? messages.filter((m: any) => m?.info?.role === "assistant")
        : [];
      const last = assistants[assistants.length - 1];
      if (last?.info) return last;
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}
