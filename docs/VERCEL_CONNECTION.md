# Connecting the deployed frontend and backend

## Current status

On 5 October 2026, the frontend at `https://krypto-vault.vercel.app` responded with the expected landing-page redirect. Both `/api/health` and `/api/ready` on `https://kryptovaultbackend.vercel.app` returned HTTP 500 with `FUNCTION_INVOCATION_FAILED`. This indicates a runtime failure; a successful build does not establish a working API. The cause requires the backend's Vercel Runtime Logs. The connected Vercel account could not access this deployment's details.

The repository now includes the API proxy configuration. It has not been verified on a redeployed frontend, and authenticated end-to-end operation remains unverified.

## Request routing

`frontend/vercel.json` forwards `/api/:path*` to `https://kryptovaultbackend.vercel.app/api/:path*`. The browser continues using `https://krypto-vault.vercel.app/api/...`, and the existing API client sends `credentials: include`. The backend issues host-only HttpOnly session cookies; through this proxy they belong to the frontend origin. Configure SameSite=Lax and Secure cookies as below. API responses must not be cached.

Do not set `window.KRYPTO_API_BASE_URL` to the backend domain for this setup. No `VITE_*` variable is needed: the current frontend is static JavaScript, and the proxy provides the connection. The backend still enforces authentication, request validation and blockchain authorization.

Vercel documents this mechanism in [external rewrites](https://vercel.com/docs/routing/rewrites).

## Backend settings

In the backend project's Vercel environment settings, configure these for **Production**, then redeploy the backend:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://krypto-vault.vercel.app` (no trailing slash) |
| `SESSION_COOKIE_SAME_SITE` | `lax` |
| `SERVE_FRONTEND` | `false` |
| `MONGODB_URI` | Your existing Atlas connection string, entered privately |
| `MONGODB_DATABASE` | The database intended for this deployment |
| `ETHEREUM_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` or your configured Sepolia provider |
| `EXPECTED_CHAIN_ID` | `11155111` |
| `CONTRACT_ADDRESS` | `0x87becA5241e43607ce2983608B1D479f97cD9a05` |

Atlas must allow connectivity from the backend deployment, and the database user must have the required permissions on the selected database. Never paste MongoDB credentials into frontend settings or commit them. The environment parser fails startup if `MONGODB_URI` is missing/invalid or production `CORS_ORIGIN` is not HTTPS; these are possible causes to check against the actual runtime error.

Production disables automatic MongoDB index creation. Before authenticated data operations, run `npm run db:prepare` from `backend/` in an environment configured with these same backend values and authorized database access; it checks the chain/database and creates required collections/indexes. Do not run against a different database accidentally.

Review the actual Vercel proxy chain before configuring `TRUST_PROXY_HOPS`; do not copy Render's hop setting or enable blanket proxy trust. Per-IP rate limiting must be checked through the frontend proxy.

## Redeploy and check

1. Resolve the first backend Runtime Logs error. Confirm `https://kryptovaultbackend.vercel.app/api/health` returns HTTP 200 with `status: "ok"` and `/api/ready` returns HTTP 200 with `database: "connected"`.
2. Commit and push the frontend proxy change, then redeploy the frontend with Root Directory `frontend`, Framework Preset `Other`, Build Command `npm run build`, and Output Directory `dist`.
3. Open `https://krypto-vault.vercel.app/api/health` and `/api/ready`. They must return the same API JSON, not HTML, a deployment-protection page or a 404. These checks establish routing and database connectivity only.
4. Open `https://krypto-vault.vercel.app/index.html`, connect MetaMask and sign the login challenge. Confirm the browser requests the frontend's `/api/*` URLs, receives the Secure/HttpOnly session cookie, and `/api/auth/me` returns HTTP 200 after signing. Before login, HTTP 401 is expected.
5. Test a small non-sensitive document on Sepolia: encrypted upload, registration, retrieval, integrity, sharing and revocation with a second wallet. Keep private document keys in their original browser profile. Check the full acceptance flow in [DEPLOYMENT.md](DEPLOYMENT.md).

## Limits to full operation on Vercel

The URL proxy does not resolve these backend constraints:

- `backend/src/auth/challenges.ts` and `session.ts` store login challenges and sessions in process-local Maps. A request reaching another function instance, or a cold start, can lose that state. Reliable serverless authentication needs a shared store, with atomic single-use challenge consumption and explicit expiration checks. A single long-running backend process is the existing documented alternative; restarting it still requires reauthentication.
- The rate limiter also uses process-local memory. Global limits across function instances need shared storage.
- The app accepts encrypted files up to 25 MiB, but Vercel Functions limit request and response payloads to **4.5 MB**, including request overhead. The current API uploads and returns file bytes through the function. Raising an environment limit cannot remove the platform limit. Use small samples for initial checks; full-size support requires a backend host that supports these payloads or a redesigned authorized direct-ciphertext storage flow. See [Vercel Function limits](https://vercel.com/docs/functions/limitations).

For the current hackathon architecture, a single Node backend as documented for Render avoids the serverless session-distribution issue. Keeping the backend on Vercel requires shared authentication state and a file-transfer design compatible with its limits before claiming full functionality.
