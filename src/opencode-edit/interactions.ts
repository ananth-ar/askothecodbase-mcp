import { unwrap } from "./sdk.ts";

export async function sendPromptWithRetry(params: {
  client: any;
  sessionId: string;
  sessionDir: string;
  chosenModel?: { providerID: string; modelID: string };
  instruction: string;
  targetPath: string;
  maxRetries?: number;
}) {
  const {
    client,
    sessionId,
    sessionDir,
    chosenModel,
    instruction,
    targetPath,
    maxRetries = 3,
  } = params;

  let attempt = 0;
  let last: any = undefined;
  while (attempt < maxRetries) {
    const res = await client.session.prompt({
      path: { id: sessionId },
      query: { directory: sessionDir },
      body: {
        agent: "build",
        ...(chosenModel ? { model: chosenModel } : {}),
        parts: [
          {
            type: "text",
            text:
              `Work on the project at path: ${targetPath}. ` +
              `Task: ${instruction}. Apply minimal necessary file edits.`,
          },
        ],
      },
    });
    const result: any = (() => {
      try {
          return unwrap(res);
      } catch (e: any) {
        // Keep the original response around to inspect for retryable errors
        return { info: { error: e } };
      }
    })();
    const err = (result as any)?.info?.error;
    const rawMsg =
      (err?.data && JSON.stringify(err.data)) ||
      (err?.message as string) ||
      "";
    const msg = String(rawMsg).toLowerCase();
    if (!err) return result;
    last = result;
    if (msg.includes("overloaded") || msg.includes("rate limit")) {
      const delay = Math.min(10000, 2000 * Math.pow(2, attempt));
      console.warn(
        `Provider overloaded/rate-limited. Retrying in ${Math.round(
          delay / 1000
        )}s...`
      );
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
      continue;
    }
    return result;
  }
  return last;
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
