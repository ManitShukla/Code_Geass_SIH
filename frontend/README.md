# KryptoVault frontend

KryptoVault is a hackathon prototype for client-encrypted documents, wallet authentication and blockchain permissions. This frontend uses the existing vanilla HTML, CSS and JavaScript architecture. The public site explains the system; the workspace runs the existing integrations.

## Run

From `frontend/`:

```sh
npm install
npm run dev
npm test
```

The development server defaults to port 8000:

- `/` and `/index.html`: functional workspace.
- `/landing_page/index.html`: public site, usable without a wallet or backend.
- `/landing_page/login.html`: wallet-access introduction, linked to the workspace's existing **Connect Wallet** action.

`REAL_MODE` is the default. The local API base is `http://localhost:4000`; on deployed hosts it defaults to the frontend origin. Configure `window.KRYPTO_API_BASE_URL` before `api.js` if the API is elsewhere. Cookies, CORS and authentication must be configured by the existing backend deployment.

For an explicitly simulated local presentation, set the development environment before starting the server:

```powershell
$env:KRYPTO_FRONTEND_MODE = "DEMO_MODE"
npm run dev
```

Demo mode is ignored in production and cannot be enabled through a query parameter. The workspace identifies its mode. Demo records, generated transaction references, tampering, reset controls and fallback wallet are simulations. Do not use real identity documents in mock KYC.

## Files and design

For production, the root `npm run build:deploy` stages only public assets into `frontend/dist`. The Render backend serves this directory and the API from one HTTPS origin. `/` redirects to the public site; `/index.html` remains the workspace. The server's `/runtime-config.js` forces REAL_MODE and the same-origin API base even on localhost packaging checks. See [deployment instructions](../docs/DEPLOYMENT.md) in the repository; this source guide does not imply that a hosted deployment already exists.

- `design.md`: public visual direction and product UX specification.
- `tokens.css`, `favicon.svg`: shared typography, colors, focus, reduced-motion foundations and identity.
- `landing_page/index.html`, `styles.css`, `script.js`: narrative sections, accessible navigation and explicitly labelled public demonstrations.
- `landing_page/sphere-geometry.js`, `sphere.svg`: shared procedural geometry and static sphere fallback. The enhanced renderer uses Canvas 2D; WebGL is not required.
- `landing_page/login.html`, `login.css`: wallet-access introduction.
- `index.html`, `styles.css`: workspace views, responsive records, forms and dialogs.
- `app.js`: existing application controller and service integration, with presentation-state callbacks.
- `presentation.js`: progress, persistent feedback, resource states, integrity result display, keyboard navigation and dialog focus. It makes no API, wallet or cryptographic calls.
- `api.js`, `crypto.js`, `blockchain.js`: API client, browser encryption identity and MetaMask/ethers helpers.
- `runtime-config.js`, `blockchain-config.js`, `KryptoVaultAccess.abi.json`, `server.js`: existing runtime/configuration boundary and static server.
- `crypto.test.js`, `blockchain.test.js`, `presentation.test.js`: regression checks. No lint, typecheck or build script is configured; the frontend is served as static files.

See [REDESIGN_NOTES.md](REDESIGN_NOTES.md) for verification and scope. The design uses Inter and JetBrains Mono through Google Fonts with local system fallbacks. It adds no frontend framework or runtime dependency.

## Real workspace flow

1. Connect MetaMask. The frontend requests a server challenge, signs its message, verifies the session and prepares the browser document-encryption identity. Authentication signatures and blockchain transactions remain separate.
2. Review Profile and, when required by application policy, the clearly labelled mock KYC flow. Its status comes from the existing response.
3. Upload a non-sensitive sample. The seven visible stages follow actual awaited operations: **Select → Hash → Encrypt → Wrap owner key → Store ciphertext → Register asset → Verify + sync**.
4. The browser computes SHA-256, generates an AES-256-GCM key, encrypts file bytes and wraps the key. Only ciphertext, wrapped key and existing metadata are posted to `/api/assets`.
5. MetaMask signs registration. After a successful receipt, `/api/assets/:assetId/blockchain-sync` verifies registration. A stored file awaiting registration, an unconfirmed transaction and a synchronization failure are distinct outcomes.
6. Open a document and use **Integrity** to compare locally decrypted plaintext with the authoritative hash. Registration verification alone is not a local plaintext-integrity check. The displayed permission, version and comparison describe the last check time.
7. Share using the existing recipient-public-key lookup, local key wrapping, wallet-signed permission change and backend synchronization. Grant validity uses the existing date inputs and contract behavior.
8. Revoke through the existing standard or strong flow. Strong revocation re-encrypts locally with a fresh key, wraps it for remaining recipients and commits/finalizes the new version.
9. Use My Files, Shared With Me, Folders, Activity and Blockchain to inspect existing records. Folders organize records; they do not confer blockchain permissions.

Configure the deployed contract and expected chain through the existing `blockchain-config.js` setup. Sepolia uses chain ID `11155111`. Keep the static ABI synchronized using `npm run export:abi` from `blockchain/` after contract compilation. No contract or backend changes are required by this visual redesign.

## Security boundaries and limitations

- MetaMask proves wallet identity and signs transactions. The separate RSA-OAEP document identity lives in this browser's IndexedDB. Only its public encryption key is uploaded; private encryption keys stay in the browser.
- AES keys are held only as needed in memory and stored only wrapped. File encryption/decryption, SHA-256, password derivation and key wrapping remain client-side. The backend must never receive plaintext files, raw AES keys, private keys, seed phrases, plaintext passwords or password-derived secret keys.
- For optional password protection, the existing browser code derives a wrapping key with PBKDF2-SHA-256 and wraps the AES key with AES-GCM. There is no second owner-public-key wrap for that asset. Opening or sharing it requires its password.
- There is no password reset or document-encryption identity recovery. Clearing IndexedDB, losing the browser profile or forgetting a file password can make existing files inaccessible. Connecting the same wallet on another browser does not restore the old document identity.
- Closing an upload dialog does not cancel an in-flight operation. Reloading the page loses the in-memory progress display. Durable operation recovery, an isolated register-now action and automatic retry/reconciliation are not implemented. Check existing records and transactions before repeating an action after an uncertain result.
- Revocation affects future authorized retrieval. It cannot erase plaintext, old ciphertext or old keys already copied by a recipient. Strong rotation protects subsequent access to the current version within the existing system's limits.
- Blockchain is authoritative for ownership and READ/WRITE/NONE permissions. Browser status labels and disabled buttons do not replace backend and contract authorization.
- KYC is a hackathon mock. The Security screen's prototype readiness score is not an audited security guarantee. Public access/integrity/rotation examples and device previews use synthetic data; they never access the user's vault.

## Motion and accessibility

The public page remains readable without JavaScript. Its sphere has an SVG fallback, including on compact screens; the brief loader reports only interface/poster readiness. Continuous decorative motion pauses offscreen and when the page is hidden, honors reduced motion and has a visible pause control. The technology story pins only on sufficiently wide, tall screens; reduced-motion and compact layouts stay in normal flow.

The document world uses three staggered strips, with the middle strip moving in reverse. Hover slows only that strip to 22% speed while the hovered card lifts and gains a soft glow. Mobile uses three independently swipeable static strips; global pause, offscreen pause and reduced motion remain available.

The workspace has labelled controls, visible focus, keyboard tabs, Escape/focus-managed dialogs, persistent feedback, mobile navigation and labelled records in place of wide mobile tables. Network failures display unavailable states; empty data does not imply a verified or successful operation.
