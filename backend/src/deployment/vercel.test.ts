import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app, { createApp } from "../app.js";
import * as database from "../config/database.js";

afterEach(() => vi.restoreAllMocks());

describe("Vercel application entry", () => {
  it("exports a callable handler and serves health without connecting to MongoDB", async () => {
    const connect = vi.spyOn(database, "connectDatabase").mockResolvedValue();
    expect(typeof app).toBe("function");
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(connect).not.toHaveBeenCalled();
  });

  it("connects on the first readiness request and reuses the connection", async () => {
    let connected = false;
    vi.spyOn(database, "isDatabaseReady").mockImplementation(() => connected);
    const connect = vi.spyOn(database, "connectDatabase").mockImplementation(async () => {
      connected = true;
    });
    const response = await request(app).get("/api/ready").expect(200);
    expect(response.body).toEqual({ status: "ready", database: "connected" });
    await request(app).get("/api/ready").expect(200);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("shares a pending connection across simultaneous requests", async () => {
    const handler = createApp({ connectOnRequest: true });
    let connected = false;
    let finish!: () => void;
    const ready = vi.spyOn(database, "isDatabaseReady").mockImplementation(() => connected);
    const connect = vi.spyOn(database, "connectDatabase").mockImplementation(() => new Promise<void>(resolve => {
      finish = () => { connected = true; resolve(); };
    }));
    const responses = Promise.all([
      request(handler).get("/api/ready").then(response => response),
      request(handler).get("/api/ready").then(response => response)
    ]);
    try {
      await vi.waitFor(() => expect(ready.mock.calls.length).toBeGreaterThanOrEqual(2));
      expect(connect).toHaveBeenCalledTimes(1);
    } finally {
      finish?.();
    }
    for (const response of await responses) expect(response.status).toBe(200);
  });

  it("returns a sanitized 503 on connection failure and retries on a later request", async () => {
    let connected = false;
    vi.spyOn(database, "isDatabaseReady").mockImplementation(() => connected);
    const connect = vi.spyOn(database, "connectDatabase")
      .mockRejectedValueOnce(new Error("mongodb://fixture-user:fixture-secret@invalid.example/test"))
      .mockImplementationOnce(async () => { connected = true; });
    const response = await request(app).get("/api/ready").expect(503);
    expect(response.body).toEqual({ error: {
      code: "DATABASE_UNAVAILABLE", message: "Database connection unavailable"
    } });
    expect(response.text).not.toContain("fixture-secret");
    await request(app).get("/api/ready").expect(200);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("preserves authentication requirements once the database is connected", async () => {
    vi.spyOn(database, "isDatabaseReady").mockReturnValue(true);
    const response = await request(app).get("/api/auth/me").expect(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });
});
