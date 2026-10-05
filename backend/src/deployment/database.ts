import type { RequestHandler } from "express";
import { connectDatabase, isDatabaseReady } from "../config/database.js";
import { HttpError } from "../errors/http-error.js";

export function createDatabaseMiddleware(): RequestHandler {
  let pendingConnection: Promise<void> | undefined;

  return async (_req, _res, next) => {
    try {
      if (!isDatabaseReady()) {
        // Concurrent cold-start requests share one connection attempt.
        pendingConnection ??= connectDatabase().finally(() => {
          pendingConnection = undefined;
        });
        await pendingConnection;
      }
      next();
    } catch {
      // Allow a later request to retry; never expose driver errors or credentials.
      next(new HttpError(503, "DATABASE_UNAVAILABLE", "Database connection unavailable"));
    }
  };
}
