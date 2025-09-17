import { createOpencodeServer } from "@opencode-ai/sdk";

async function isServerReachable(baseUrl: string): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, "")}/app`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export type ServerHandle = { url: string; close: () => void } | null;

export async function ensureServer(): Promise<{
  baseUrl: string;
  server: ServerHandle;
}> {
  // Prefer an existing server provided via environment (.env)
  const baseUrlEnv = process.env.OPENCODE_BASE_URL;
  if (baseUrlEnv) {
    const ok = await isServerReachable(baseUrlEnv);
    if (ok) {
      // console.info("Using existing opencode server:", baseUrlEnv);
      return { baseUrl: baseUrlEnv, server: null };
    }
    console.warn(
      `Configured OPENCODE_BASE_URL is not reachable: ${baseUrlEnv}. Starting a local server...`
    );
  }

  // Otherwise, start a local server that reads configuration from opencode.json
  let server: Awaited<ReturnType<typeof createOpencodeServer>>;
  const tryPorts = [4096, 4097, 0];
  let lastErr: unknown = undefined;
  for (const port of tryPorts) {
    try {
      server = await createOpencodeServer({
        hostname: "127.0.0.1",
        port,
        // Do not override config here; allow opencode.json (local or global) to apply
      });
      // console.info("Started local opencode server:", server.url);
      return { baseUrl: server.url, server };
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  const hint =
    "Failed to start opencode server. Stop other opencode instances or set OPENCODE_BASE_URL to an existing server (e.g., http://127.0.0.1:4096). Check logs under %USERPROFILE%/.local/share/opencode/log.";
  throw new Error(`${hint}\nOriginal error: ${(lastErr as Error)?.message}`);
}
