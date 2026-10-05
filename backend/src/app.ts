import cors from "cors";
import express from "express";
import helmetModule from "helmet";
import type { RequestHandler } from "express";

import { env } from "./config/env.js";
import { attachSession } from "./auth/session.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { generalApiLimiter } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/request-logger.js";
import { healthRouter } from "./routes/health.js";
import { activityRouter } from "./routes/activity.js";
import { authRouter } from "./routes/auth.js";
import { readyRouter } from "./routes/ready.js";
import { usersRouter } from "./routes/users.js";
import { assetsRouter } from "./routes/assets.js";
import { foldersRouter } from "./routes/folders.js";
import { kycRouter } from "./routes/kyc.js";
import { blockchainRouter } from "./routes/blockchain.js";
import { securityPolicyRouter } from "./routes/security-policy.js";
import { createFrontendRouter } from "./deployment/frontend.js";
import { createDatabaseMiddleware } from "./deployment/database.js";

type HelmetFactory = () => RequestHandler;

const helmet =
  ((helmetModule as unknown as { default?: HelmetFactory }).default ??
    helmetModule) as HelmetFactory;

export function createApp({ connectOnRequest = false } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  app.use(requestId);

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );

  app.use(
    express.json({
      limit: env.JSON_BODY_LIMIT
    })
  );

  app.use(attachSession);
  app.use(requestLogger);

  app.use("/api", generalApiLimiter);
  app.use("/api/health", healthRouter);

  if (connectOnRequest) app.use("/api", createDatabaseMiddleware());

  app.use("/api/activity", activityRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/assets", assetsRouter);
  app.use("/api/folders", foldersRouter);
  app.use("/api/blockchain", blockchainRouter);
  app.use("/api/kyc", kycRouter);
  app.use("/api/security-policy", securityPolicyRouter);
  app.use("/api/ready", readyRouter);
  app.use("/api/users", usersRouter);

  if (env.SERVE_FRONTEND) app.use(createFrontendRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Vercel detects src/app.ts directly; importing it must not open a listener.
export default createApp({ connectOnRequest: true });
