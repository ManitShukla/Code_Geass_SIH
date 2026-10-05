import { randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";

export const sessionCookieName = "secure_vault_session";

type Session = {
  walletAddress: string;
  expiresAt: number;
};

const sessions = new Map<string, Session>();

declare module "express-serve-static-core" {
  interface Request {
    sessionId?: string;
    walletAddress?: string;
  }
}

export function createSession(walletAddress: string) {
  const sessionId = randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    walletAddress,
    expiresAt: Date.now() + env.SESSION_TTL_MS
  });
  return sessionId;
}

export function destroySession(sessionId: string) {
  sessions.delete(sessionId);
}

export function clearSessionsForTests() {
  sessions.clear();
}

export function getSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }

  return session;
}

export function buildSessionCookie(sessionId: string) {
  const sameSite = env.SESSION_COOKIE_SAME_SITE ?? (env.CORS_ORIGIN.startsWith("https://") ? "none" : "lax");
  const cookieParts = [
    `${sessionCookieName}=${sessionId}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`,
    `Max-Age=${Math.floor(env.SESSION_TTL_MS / 1000)}`
  ];

  if (sameSite === "none" || env.CORS_ORIGIN.startsWith("https://") || env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function buildClearSessionCookie() {
  const sameSite = env.SESSION_COOKIE_SAME_SITE ?? (env.CORS_ORIGIN.startsWith("https://") ? "none" : "lax");
  const cookieParts = [
    `${sessionCookieName}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`,
    "Max-Age=0"
  ];

  if (sameSite === "none" || env.CORS_ORIGIN.startsWith("https://") || env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function readCookie(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${cookieName}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

export const attachSession: RequestHandler = (req, _res, next) => {
  const sessionId = readCookie(req.headers.cookie, sessionCookieName);
  if (!sessionId) {
    return next();
  }

  const session = getSession(sessionId);
  if (session) {
    req.sessionId = sessionId;
    req.walletAddress = session.walletAddress;
  }

  return next();
};
