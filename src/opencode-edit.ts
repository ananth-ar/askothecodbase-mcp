import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";

type ServerHandle = { url: string; close: () => void } | null;

function toModel(
  input: string | undefined
): { providerID: string; modelID: string } | undefined {
  if (!input) return undefined;
  const [providerID, ...rest] = input.split("/");
  const modelID = rest.join("/");
  if (!providerID || !modelID) return undefined;
  return { providerID, modelID };
}

async function pickModel(baseUrl: string) {
  const client = createOpencodeClient({ baseUrl, responseStyle: "data" });
  try {
    // Try to use configured model from the server config
    const cfg = await client.config.get();
    const parsed = toModel((cfg as any)?.model);
    if (parsed) return parsed;
  } catch {
    // Fall back if server not ready yet (e.g., starting programmatically)
  }
  // As a last resort, let the server default decide (omit model)
  return undefined;
}

async function ensureServer(): Promise<{
  baseUrl: string;
  server: ServerHandle;
}> {
  const baseUrl = process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096";
  if (process.env.OPENCODE_BASE_URL) {
    return { baseUrl, server: null };
  }

  // Start a local server with permissive edit permissions to avoid approval prompts
  const server = await createOpencodeServer({
    hostname: "127.0.0.1",
    port: 4096,
    config: {
      // Default model for demo runs
      model: "openai/gpt-5",
      // Allow edits without asking to keep this demo simple
      permission: { edit: "allow" },
    } as any,
  });
  return { baseUrl: server.url, server };
}

export async function main() {
  // Accept CLI args: path and a short instruction. Defaults kept simple.
  const targetPath = process.argv[2] ?? "D:\react_opencodetest";
  const instruction =
    process.argv.slice(3).join(" ") ||
    // `Append the line \n\n"Edited by opencode SDK demo"\n\n` +
    //   `at the end of ${targetPath}. Use the edit tool with a minimal change.`;
    `in this path D:\react_opencodetest a react project is here now i
     want to make nice looking login page have full freedom in design choice `;

  const { baseUrl, server } = await ensureServer();
  const client = createOpencodeClient({ baseUrl, responseStyle: "data" });

  // Optionally set OpenAI credentials programmatically via env
  // Safer than hardcoding; use `OPENAI_API_KEY` in your shell/.env
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      await client.auth.set({
        path: { id: "openai" },
        body: { type: "api", key: openaiKey },
      } as any);
    } catch (e) {
      console.error("Failed to set OpenAI key via client.auth.set:", e);
    }
  }

  // Pick a model if server config has one; otherwise omit and let server decide.
  const chosenModel = await pickModel(baseUrl);

  // Create a session
  const session = await client.session.create({
    body: { title: "SDK code edit demo" },
  });

  if (!session.data?.id) {
    throw new Error("Session ID is undefined");
  }

  console.log("starting edit");
  // Ask the agent to apply a minimal edit
  const result = await client.session.prompt({
    path: { id: session.data.id },
    body: {
      ...(chosenModel ? { model: chosenModel } : {}),
      parts: [
        {
          type: "text",
          text:
            `Edit the file ${targetPath} in this workspace. ` +
            `Make the following exact change: ${instruction} `,
        },
      ],
    },
  });
  console.log("edit completed");
  // Print a concise summary of what happened
  const summary = {
    sessionId: session.data?.id,
    messageId: (result as any)?.info?.id,
    parts: (result as any)?.parts?.map((p: any) => p.type),
  };
  console.log("Edit request sent. Result summary:", summary);

  // Optional: show the final file content to verify
  try {
    const content = await client.file.read({ query: { path: targetPath } });
    console.log(`\nCurrent ${targetPath} content (truncated to 400 chars):\n`);
    const out = content.data?.content ?? "";
    console.log(out.slice(0, 400));
  } catch (err) {
    console.warn(`Could not read ${targetPath}:`, (err as Error).message);
  }

  // Clean up if we started a server programmatically
  if (server) server.close();
}
