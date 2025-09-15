import { createOpencodeClient } from "@opencode-ai/sdk";
import fs from "node:fs";
import { ensureServer } from "./opencode-edit/server.ts";
import { pickModel, toModel } from "./opencode-edit/model.ts";
import {
  sendPromptWithRetry,
  tryFetchAssistantMessage,
} from "./opencode-edit/interactions.ts";
import { unwrap } from "./opencode-edit/sdk.ts";

export async function main() {
  // Read target path strictly from environment (.env) or default to CWD
  const targetPathInput =
    process.env.OPENCODE_TARGET_PATH ||
    process.cwd();

  // Normalize path separators so downstream consumers see a stable form.
  // Using forward slashes is safe on Windows APIs.
  const targetPath = targetPathInput.replace(/\\/g, "/");
  const sessionDir = (() => {
    const last = targetPath.split("/").pop() ?? targetPath;
    if (/\.[A-Za-z0-9]+$/.test(last)) {
      const idx = targetPath.lastIndexOf("/");
      return idx > 0 ? targetPath.slice(0, idx) : ".";
    }
    return targetPath;
  })();

  const instruction =
    process.env.OPENCODE_INSTRUCTION ||
    process.env.EDIT_INSTRUCTION ||
    `Create a clean, modern login page in the project at ${JSON.stringify(
      targetPath
    )}. You may add files as needed (components, styles, route). Keep changes minimal but functional.`;

  // Ensure target directory exists so file operations can succeed
  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      console.log("Created directory:", JSON.stringify(sessionDir));
    }
  } catch (err) {
    console.warn(
      "Could not create directory:",
      JSON.stringify(sessionDir),
      String(err)
    );
  }

  const { baseUrl, server } = await ensureServer();
  const client = createOpencodeClient({ baseUrl, responseStyle: "data" });

  // Resolve model: env override, else server config, else omit.
  const envModel = toModel(process.env.OPENCODE_MODEL);
  const chosenModel = envModel ?? (await pickModel(baseUrl));

  // Create a session scoped to the target directory
  const sessionRes = await client.session.create({
    body: { title: "SDK code edit demo" },
    query: { directory: sessionDir },
  });

  const session = unwrap(sessionRes);
  if (!session?.id) {
    throw new Error("Session ID is undefined");
  }

  console.log("starting edit");
  console.log("Resolved target path:", JSON.stringify(targetPath));
  if (sessionDir !== targetPath) {
    console.log("Scoping session to directory:", JSON.stringify(sessionDir));
  }
  // Ask the agent to apply a minimal edit
  if (chosenModel) {
    console.log(
      "Requesting model:",
      `${chosenModel.providerID}/${chosenModel.modelID}`
    );
  } else {
    console.log("Using agent: build (no explicit model)");
  }
  const result = await sendPromptWithRetry({
    client,
    sessionId: session.id,
    sessionDir,
    chosenModel: chosenModel as any,
    instruction,
    targetPath,
  });
  console.log("edit completed");
  // Print a concise summary of what happened. Some servers stream and respond
  // with empty bodies initially; try to resolve the last assistant message.
  const baseSummary = {
    sessionId: session.id,
    messageId: (result as any)?.info?.id,
    model: (result as any)?.info?.providerID
      ? `${(result as any)?.info?.providerID}/${(result as any)?.info?.modelID}`
      : undefined,
    error: (result as any)?.info?.error ?? null,
    parts: (result as any)?.parts?.map((p: any) => p.type),
  } as any;

  let resolved = baseSummary;
  if (!baseSummary.messageId || !baseSummary.model) {
    const last = await tryFetchAssistantMessage({
      client,
      sessionId: session.id,
    });
    if (last?.info) {
      resolved = {
        ...resolved,
        messageId: last.info.id,
        model:
          last.info?.providerID && last.info?.modelID
            ? `${last.info.providerID}/${last.info.modelID}`
            : resolved.model,
        error: last.info?.error ?? resolved.error,
        parts: Array.isArray(last.parts)
          ? last.parts.map((p: any) => p.type)
          : resolved.parts,
      };
    }
  }

  console.log("Edit request sent. Result summary:", resolved);

  // Optional: show the final file content to verify
  try {
    // Show a quick snapshot of project files from the scoped directory
    const filesRes = await client.find.files({
      query: { query: "*", directory: sessionDir } as any,
    });
    const files = unwrap(filesRes);
    const first = Array.isArray(files) && files[0];
    console.log(
      `\nFound ${
        Array.isArray(files) ? files.length : 0
      } files in ${JSON.stringify(sessionDir)}.`
    );
    if (first && typeof first === "string") {
      const contentRes = await client.file.read({
        query: { path: first, directory: sessionDir },
      });
      const content = unwrap(contentRes);
      console.log(`\nPreview of ${first} (first 400 chars):\n`);
      const out = (content as any)?.content ?? "";
      console.log(String(out).slice(0, 400));
    }
  } catch (err) {
    console.warn(
      `Could not enumerate files or preview in ${sessionDir}:`,
      (err as Error).message
    );
  }

  // Clean up if we started a server programmatically
  if (server) server.close();
}
