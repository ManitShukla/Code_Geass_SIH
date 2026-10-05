import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("deployment environment validation", () => {
  it("uses Render's generated origin when no explicit CORS origin is provided", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CORS_ORIGIN", undefined);
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://fresh-vault.onrender.com");
    vi.resetModules();
    const { env } = await import("./env.js");
    expect(env.CORS_ORIGIN).toBe("https://fresh-vault.onrender.com");
  });

  it.each(["*", "https://vault.example.com/path", "https://one.example,https://two.example", "http://localhost:8000"])(
    "rejects invalid production origin %s", async (origin) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("CORS_ORIGIN", origin);
      vi.resetModules();
      await expect(import("./env.js")).rejects.toThrow();
    }
  );

  it("does not treat the string false as enabling the production frontend", async () => {
    vi.stubEnv("SERVE_FRONTEND", "false");
    vi.stubEnv("TRUST_PROXY_HOPS", "0");
    vi.resetModules();
    const { env } = await import("./env.js");
    expect(env.SERVE_FRONTEND).toBe(false);
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });
});
