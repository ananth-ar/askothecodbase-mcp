import { describe, it, expect } from "bun:test";
import { formatAlert, makeNWSRequest } from "../src/weather-server.ts";

describe("formatAlert", () => {
  it("formats an alert with defaults when fields missing", () => {
    const formatted = formatAlert({
      properties: {
        // intentionally sparse
      },
    });
    expect(formatted).toContain("Event: Unknown");
    expect(formatted).toContain("Area: Unknown");
    expect(formatted).toContain("Severity: Unknown");
    expect(formatted).toContain("Status: Unknown");
    expect(formatted).toContain("Headline: No headline");
  });

  it("formats an alert with provided fields", () => {
    const formatted = formatAlert({
      properties: {
        event: "Flood Warning",
        areaDesc: "Some County, ST",
        severity: "Severe",
        status: "Actual",
        headline: "Flooding expected along river",
      },
    });
    expect(formatted).toContain("Event: Flood Warning");
    expect(formatted).toContain("Area: Some County, ST");
    expect(formatted).toContain("Severity: Severe");
    expect(formatted).toContain("Status: Actual");
    expect(formatted).toContain("Headline: Flooding expected along river");
    expect(formatted.trimEnd().endsWith("---")).toBeTrue();
  });
});

describe("makeNWSRequest", () => {
  it("returns null when response is not ok", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(null, { status: 500 }) as any;
      const result = await makeNWSRequest<any>("https://api.weather.gov/does-not-matter");
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns parsed json when ok", async () => {
    const originalFetch = globalThis.fetch;
    try {
      const payload = { hello: "world" };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      globalThis.fetch = async () => new Response(blob, { status: 200 }) as any;
      const result = await makeNWSRequest<typeof payload>("https://api.weather.gov/anything");
      expect(result).not.toBeNull();
      expect(result!.hello).toBe("world");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

