# Fresh KryptoVault deployment

## Status

**Prepared and locally validated; not deployed.** This working folder has no `.git` repository/remote, no MongoDB credentials, and no connected Atlas management tool. Render OAuth works, but its tool requires the user to confirm the workspace before service operations. No cloud service, database, application record or blockchain transaction was created by this task.

The connected Render workspace offered is **My Workspace** (`tea-dahequjl550s7380gge0`). Confirm it and provide the source repository URL and branch. Never send wallet private keys or seed phrases. Put database credentials directly into Render's environment settings.

## Hosting decision

Use one Render Node web service for the public site, authenticated workspace and Express API, plus a **fresh database on MongoDB Atlas** and the existing canonical Sepolia contract. The process listens on `0.0.0.0:$PORT`.

| URL on the new HTTPS origin | Purpose |
|---|---|
| `/` | Redirects to the public landing page |
| `/landing_page/index.html` | Public site |
| `/landing_page/login.html` | Wallet entry explanation |
| `/index.html` | Existing workspace and Connect Wallet flow |
| `/api/*` | Existing backend routes |
| `/api/health` | Process health |
| `/api/ready` | MongoDB connection readiness |

Both frontends and API share one origin. Runtime configuration forces REAL_MODE and `window.KRYPTO_API_BASE_URL=window.location.origin`. The browser keeps `credentials: include`. Session cookies are host-only, HttpOnly, Secure and SameSite=Lax. No token is exposed to JavaScript. A custom domain requires setting `CORS_ORIGIN` to that exact HTTPS origin, without a trailing slash or path.

The existing root `vercel.json`/`server.ts` are not the selected deployment path. Serverless instance distribution would split the existing process-local challenges and sessions. This deployment runs **one instance and one Node process**, with no process cluster or autoscaling. Sessions/challenges are lost on restart and require reconnecting the wallet. Free Render services also spin down after inactivity; use an approved paid plan for an always-on demo, but do not scale out with the current session store. See [Render web services](https://render.com/docs/web-services) and [free-service behavior](https://render.com/docs/free).

## Exact remaining inputs

1. A GitHub/GitLab/Bitbucket repository and branch containing these local changes, accessible to Render. This folder currently is not a Git checkout; no remote or branch was invented.
2. Confirmation to use the connected Render workspace above.
3. A MongoDB Atlas cluster with replica-set/transaction support, a fresh database named `kryptovault-fresh-20260921` (or another unused name), and an application database user scoped to that database. The user needs the database `readWrite` capabilities used for records, collections and indexes. Do not reuse an existing production database for this fresh deployment.
4. The resulting **`MONGODB_URI`**, entered privately in Render. Percent-encode reserved characters in the URI username/password. The explicit `MONGODB_DATABASE` overrides any database path in the URI.
5. Atlas network access permitting the selected Render service's outbound ranges. Find them on the created service's **Connect → Outbound** panel and add only the necessary ranges to Atlas. Do not expose MongoDB publicly without its normal authentication/TLS.
6. Two browser profiles with MetaMask test wallets and Sepolia test ETH to perform the real owner/recipient acceptance flow. Wallet private keys stay inside MetaMask.

No deployer key, `SESSION_SECRET`, JWT secret or raw encryption key is required. The backend never signs transactions. The supplied public RPC is usable without credentials; a dedicated provider URL can replace it privately in `ETHEREUM_RPC_URL` if needed.

## Database and GridFS

Use Atlas, not standalone MongoDB: strong-revoke finalization uses MongoDB transactions. No separate GridFS server or Render disk is needed; the `encryptedAssets.files` and `encryptedAssets.chunks` collections live in the same selected database.

Production deliberately leaves automatic Mongoose index creation disabled. The startup command runs `db:prepare` before listening. It checks the canonical chain/address, RPC chain ID and contract bytecode, database connectivity and transaction-capable topology; then it creates model collections and schema/GridFS indexes additively. It never seeds users, uploads, grants or audit records and never drops data/indexes. Duplicate/index conflicts fail startup instead of being silently repaired. Creating collections first also avoids first-use collection creation inside the strong-revoke transaction.

After deployment, run `npm --prefix backend run verify:deploy` in the service shell, if available, with its existing environment to check RPC, database and indexes without seeding application records. `/api/ready` alone checks only MongoDB connectivity; it does not establish that the full application works.

## Build and deploy

Use Node **22.23.2** (pinned in `render.yaml`). From the repository root:

```sh
npm ci --prefix backend --include=dev
npm ci --prefix frontend
npm run build:deploy
npm test
```

The build compiles the backend and stages an explicit allowlist into `frontend/dist`. Source scripts, environment files, package manifests, tests, reviews and arbitrary dependency files are not published. Only the required ethers browser bundle is copied from `node_modules`.

For Render:

1. Publish the reviewed changes to the confirmed Git repository/branch. If creating a new checkout, initialize it and add the chosen remote first. Review staged files before committing; `.env`, dependencies and build outputs remain ignored.
2. If the Render CLI is installed/authenticated, run `render blueprints validate render.yaml`. The CLI was not available in this environment; provider-side Blueprint validation remains required.
3. Open **New → Blueprint** in [Render Dashboard](https://dashboard.render.com), connect the chosen repository and select the deployment branch. Use the checked-in `render.yaml`; create a fresh service rather than editing an existing service.
4. Enter `MONGODB_URI` when prompted. The Blueprint sets the fresh database name, GridFS bucket, HTTPS cookie mode, proxy hop count, Node version, Sepolia configuration and REAL_MODE frontend serving. `CORS_ORIGIN` defaults to Render's generated `RENDER_EXTERNAL_URL` ([documented environment variable](https://render.com/docs/environment-variables)).
5. Create the service; add its outbound ranges to Atlas. If the first deployment cannot connect before the allowlist is set, redeploy after fixing Atlas access.
6. Wait for startup preflight and `/api/ready`. Obtain the **actual assigned service URL** from Render; no URL in this guide represents an already-created deployment. Automatic deploys are disabled to avoid unexpectedly resetting sessions during the demo.

Equivalent service settings:

```text
Root directory: repository root
Runtime: Node
Instances: 1
Build: npm ci --prefix backend --include=dev && npm ci --prefix frontend && npm run build:deploy
Start: npm run start:deploy
Health check: /api/ready
```

`start:deploy` performs `db:prepare` and then starts the unchanged backend listener. Set secrets only in the service's environment, not in build scripts, frontend config or Git. Render's reverse proxy is represented by `TRUST_PROXY_HOPS=1`; if another proxy is introduced, review its trusted path instead of setting blanket `trust proxy=true`.

## Sepolia verification

- Chain ID: **11155111** (`0xaa36a7`).
- Contract: **0x87becA5241e43607ce2983608B1D479f97cD9a05**.
- Public RPC: **https://ethereum-sepolia-rpc.publicnode.com**.
- Browser ABI: `/KryptoVaultAccess.abi.json`.

During preparation, real read-only RPC calls returned `0xaa36a7` and 3,255 bytes of deployed bytecode at this address. The previous `rpc.sepolia.org` default failed from this environment. No new contract was deployed and no blockchain write occurred. Contract bytecode presence does not prove successful application transactions. The existing browser helper and backend receipt/event/permission checks remain authoritative.

## Required live acceptance record

**Every item below is pending against the new deployment.** Do not mark deployment complete based on unit tests or health checks.

| Flow | Actual acceptance evidence needed |
|---|---|
| Public and workspace | Public `/`, login and `/index.html` load with no missing assets or CSP errors; runtime is REAL_MODE |
| Authentication | MetaMask signs a real challenge; verify succeeds; HttpOnly Secure cookie is set and sent; `/api/auth/me` returns the selected wallet; replay/expired challenge fails; logout removes session |
| Wallet changes | Account/chain changes clear stale state; incorrect network is handled; rejected signatures never create success |
| Browser identity | Both wallets register public encryption keys from their respective browsers; private CryptoKeys remain in IndexedDB |
| Upload | Browser encrypts a non-sensitive sample; only ciphertext/wrapped keys/metadata cross the API; GridFS bytes and version metadata persist; MetaMask registers it; backend verifies the real receipt/event and marks ACTIVE |
| Integrity/open | Owner retrieves only their current wrapped key, decrypts locally and matches SHA-256; bytes/hash shown in the browser match the original local sample |
| Sharing/access | Owner grants recipient READ with an actual transaction; backend sync succeeds; recipient sees Shared With Me and opens; unrelated wallet is denied; future/expired validity windows are enforced |
| Standard revoke | Actual revoke receipt syncs; recipient can no longer retrieve ciphertext/open the asset |
| Strong revoke | Re-grant as appropriate; strong revoke removes recipient, rotates the key locally, commits version and finalizes; remaining recipients open the new version; revoked recipient gets no current key |
| Folders/activity/blockchain | Create/move folder succeeds; activity and blockchain records contain actual matching operations/transaction references |
| KYC | Existing explicitly labelled MOCK status flow persists via API; no identity-document contents are uploaded. This is not a production KYC provider |
| Errors | Wrong network, wallet rejection, invalid recipient, API denial and synchronization interruption display failures; inspect actual transaction before retrying |
| Persistence | After a controlled service restart, records and GridFS ciphertext remain; users reauthenticate because sessions are process-local |

Record the deployed URL, Git commit, check time, public transaction hashes, browser-observed outcomes and pass/fail status. Never record session cookies, signatures, plaintext, raw AES keys or private key material in the report. Preserve previously downloaded-data/recovery limitations; neither revocation nor this deployment can erase a recipient's saved plaintext or restore lost browser encryption keys.

## Validation completed locally

- Backend TypeScript build passed.
- Backend: **20 test files, 221 tests passed**, including new deployment-origin, secure-cookie, proxy and static-delivery checks. These use test fixtures where appropriate and do not establish live Atlas/MetaMask success.
- Existing frontend crypto, blockchain and upload-presentation suites passed.
- Production frontend staged successfully; packaged public site/login/workspace/bundle returned 200, secret/source/review paths returned 404, unauthenticated `/api/auth/me` returned 401.
- Headless Chrome confirmed REAL_MODE, same-origin API base, ethers/Web Crypto helper availability, upload dialog operation, existing inline event handlers under CSP, three document strips and no runtime JavaScript exceptions. Workspace widths 320–1920 had no document overflow.
- The local packaging check deliberately had no database connection; `/api/ready` correctly returned 503. It did not inject fake successful API responses.
- Public Sepolia chain/bytecode checks passed as described above.
- The installed Node 24 runtime hung on directory creation. A checksum-verified official Node 22.23.2 executable in ignored `.local-startup/deployment/tools` was used for installation/build/tests; the system installation was not changed.

No hosted URL, authenticated live API flow, MongoDB/GridFS persistence test or MetaMask transaction has been verified yet. Those require the remaining inputs and the acceptance run above.
