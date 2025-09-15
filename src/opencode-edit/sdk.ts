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
