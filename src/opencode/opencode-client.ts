import { createOpencodeClient } from "@opencode-ai/sdk";
import type { ServerHandle } from "./server.ts";
import { ensureServer } from "./server.ts";

let cachedBaseUrl: string | null = null;
let activeServer: ServerHandle = null;
let cleanupRegistered = false;

function registerCleanup() {
  if (cleanupRegistered || !activeServer) {
    return;
  }
  cleanupRegistered = true;
  const dispose = () => {
    if (activeServer) {
      try {
        activeServer.close();
      } catch {
        // ignore cleanup errors
      }
      activeServer = null;
      cachedBaseUrl = null;
    }
  };
  process.once("exit", dispose);
  const handleSignal = (signal: NodeJS.Signals) => {
    dispose();
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);
}

async function ensureBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const { baseUrl, server } = await ensureServer();
  cachedBaseUrl = baseUrl;
  activeServer = server;
  registerCleanup();
  return baseUrl;
}

export async function createAnalysisClient() {
  const baseUrl = await ensureBaseUrl();
  return createOpencodeClient({ baseUrl, responseStyle: "data" });
}
