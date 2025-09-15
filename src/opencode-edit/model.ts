import { createOpencodeClient } from "@opencode-ai/sdk";
import { unwrap } from "./sdk.ts";

export type ModelRef = { providerID: string; modelID: string };

export function toModel(input: string | undefined): ModelRef | undefined {
  if (!input) return undefined;
  const [providerID, ...rest] = input.split("/");
  const modelID = rest.join("/");
  if (!providerID || !modelID) return undefined;
  return { providerID, modelID };
}

export async function pickModel(baseUrl: string): Promise<ModelRef | undefined> {
  const client = createOpencodeClient({ baseUrl, responseStyle: "data" });
  try {
    const cfgRes = await client.config.get();
    const cfg: any = unwrap<any>(cfgRes as any);
    const parsed = toModel(cfg?.model);
    if (parsed) return parsed;
  } catch {
    // Server might not be ready yet; fall back to default
  }
  return undefined;
}
