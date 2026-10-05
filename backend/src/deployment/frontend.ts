import express from "express";
import { contentSecurityPolicy } from "helmet";
import { fileURLToPath } from "node:url";

export const frontendDirectory = fileURLToPath(new URL("../../../frontend/dist/", import.meta.url));

export function createFrontendRouter(directory = frontendDirectory) {
  const router = express.Router();
  // Keep the existing classic scripts and onclick handlers functional. Inline
  // script elements stay blocked; only event attributes retain legacy support.
  router.use(contentSecurityPolicy({ directives: {
    "script-src": ["'self'"],
    "script-src-attr": ["'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "connect-src": ["'self'", "https://rpc.sepolia.org", "https://ethereum-sepolia-rpc.publicnode.com"],
    "img-src": ["'self'", "data:", "blob:"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"]
  } }));
  router.get("/", (_req, res) => res.redirect(302, "/landing_page/index.html"));
  router.get("/runtime-config.js", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.type("application/javascript").send(
      'window.KRYPTO_APP_MODE="REAL_MODE";\n' +
      'window.KRYPTO_ALLOW_DEMO_MODE=false;\n' +
      'window.KRYPTO_API_BASE_URL=window.location.origin;\n'
    );
  });
  // Only the allowlisted build output is public, never the source tree or .env.
  router.use(express.static(directory, {
    index: false, dotfiles: "deny", redirect: false,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store")
  }));
  return router;
}
