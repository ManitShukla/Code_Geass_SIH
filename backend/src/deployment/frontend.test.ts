import request from "supertest";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createFrontendRouter } from "./frontend.js";
import { createApp } from "../app.js";
import { env } from "../config/env.js";

describe("production frontend delivery", () => {
  const directory = mkdtempSync(join(tmpdir(), "kryptovault-static-test-"));
  const app = express().use(createFrontendRouter(directory));
  beforeAll(() => {
    for (const file of ["index.html", "landing_page/index.html", "landing_page/login.html", "crypto.js", "KryptoVaultAccess.abi.json", "node_modules/ethers/dist/ethers.umd.min.js"]) {
      mkdirSync(dirname(join(directory, file)), { recursive: true });
      writeFileSync(join(directory, file), file.endsWith(".html") ? "<!doctype html><title>Static fixture</title>" : "{}");
    }
    writeFileSync(join(directory, ".env"), "TEST_ONLY=private-fixture");
  });
  afterAll(() => {
    if (dirname(directory) !== tmpdir() || !directory.includes("kryptovault-static-test-")) throw new Error("Unexpected fixture directory");
    rmSync(directory, { recursive: true, force: true });
  });

  it("routes public entry and delivers the existing workspace and browser dependencies", async () => {
    await request(app).get("/").expect(302).expect("Location", "/landing_page/index.html");
    for (const path of ["/index.html", "/landing_page/index.html", "/landing_page/login.html", "/crypto.js", "/KryptoVaultAccess.abi.json", "/node_modules/ethers/dist/ethers.umd.min.js"]) {
      await request(app).get(path).expect(200);
    }
  });

  it("forces real mode and same-origin API requests without exposing environment values", async () => {
    const response = await request(app).get("/runtime-config.js?mode=DEMO_MODE").expect(200);
    expect(response.text).toContain('window.KRYPTO_APP_MODE="REAL_MODE"');
    expect(response.text).toContain("window.KRYPTO_ALLOW_DEMO_MODE=false");
    expect(response.text).toContain("window.KRYPTO_API_BASE_URL=window.location.origin");
    expect(response.text).not.toContain(env.MONGODB_URI);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("does not publish source, environment files, dependencies or review material", async () => {
    for (const path of ["/.env", "/server.js", "/package.json", "/crypto.test.js", "/review/browser-check.cjs", "/node_modules/ethers/package.json", "/backend/.env"]) {
      await request(app).get(path).expect(404);
    }
  });

  it("allows the existing event handlers and fonts while blocking inline script elements", async () => {
    const response = await request(app).get("/index.html").expect(200);
    const csp = response.headers["content-security-policy"];
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("script-src-attr 'unsafe-inline'");
    expect(csp).toContain("https://fonts.googleapis.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("keeps API authentication and readiness routes ahead of static delivery", async () => {
    const original = env.SERVE_FRONTEND;
    env.SERVE_FRONTEND = true;
    try {
      await request(createApp()).get("/api/auth/me").expect(401);
      await request(createApp()).get("/api/health").expect(200);
      await request(createApp()).get("/api/unknown").expect(404).expect("Content-Type", /json/);
    } finally { env.SERVE_FRONTEND = original; }
  });
});
