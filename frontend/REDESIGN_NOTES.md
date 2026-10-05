# Frontend redesign and verification

Implemented against `frontend/design.md`, retaining the user's existing vanilla HTML/CSS/JavaScript architecture and frontend-only scope.

## Changed files

Existing files changed:

- `index.html`, `styles.css`: shared workspace shell, all existing views/dialogs, mobile records/navigation and honest status copy.
- `app.js`: presentation callbacks at existing async boundaries, seven upload stages, actual registration/KYC labels, Integrity results and resource feedback. Real upload display delays were removed. Reopening an active upload preserves its progress.
- `landing_page/index.html`, `styles.css`, `script.js`: full public narrative and responsive interactions.
- `landing_page/login.html`: working route to the existing wallet-authentication entry point.
- `package.json`: includes the new presentation regression test in `npm test`; dependencies unchanged.
- `README.md`: current setup, mode behavior, workflows and security limitations.

Added files:

- `tokens.css`, `favicon.svg`: shared identity and accessibility foundations.
- `presentation.js`: isolated DOM presentation helpers; no wallet, API or cryptography calls.
- `presentation.test.js`: real upload-controller regression tests with test-only service doubles.
- `landing_page/login.css`: wallet-access layout.
- `landing_page/sphere-geometry.js`, `sphere.svg`: connected banded mesh, rings and static fallback.
- `REDESIGN_NOTES.md`: this record.
- `review/`: browser verification helpers/results, poster generator and selected review screenshots. These are development artifacts, not application entry points.

The API client, cryptographic module, blockchain helper/config, runtime config, static server, ABI, package lock and existing tests match their original SHA-256 hashes. The initial redesign left `design.md` unchanged; the document-strip follow-up below updates its interaction specification. No files outside `frontend/` were added or changed, including backend, blockchain, root configuration and documentation. This checkout has no Git repository metadata, so the final comparison used initial file snapshots, `git diff --no-index` and SHA-256 baselines.

## Visual and interaction coverage

The public site includes the brief truthful preloader, static/enhanced mesh sphere hero, minimal hero navigation, sticky six-section navigation and mobile drawer, flowing document world, two-card problem story, seven-stage encryption narrative, access/integrity/rotation demonstrations, use cases, architecture disclosure panels and matrix, device previews, resources, closing CTA and footer. The old `usecases` and `impact` anchors remain available.

The public demonstrations use clearly identified synthetic data. Their state changes do not perform authentication, encryption, grant/revoke operations or network transactions. Canvas 2D provides the optional sphere motion; the SVG remains available without Canvas/WebGL/JavaScript. Inter and JetBrains Mono fall back to local system fonts if the font service is unavailable.

The workspace retains Dashboard, My Files, Shared With Me, Folders, Activity, Blockchain, Profile, Security, Settings, upload, document details, grant/revoke, mock KYC and folder organization. It adds a local Integrity result view, persistent status/error messages, modal focus handling, keyboard tabs, labelled controls and responsive records. Public scene effects stay out of the working views.

## Preserved integration boundaries

- Authentication still uses the existing server challenge, wallet message signature, session verification and separate browser encryption identity. Account-change guards and session behavior were retained.
- All API endpoints, existing request payloads, response parsing and authorization decisions remain in the original modules/controller paths.
- File hashing, AES-GCM encryption/decryption, password derivation and RSA-OAEP wrapping remain client-side. No plaintext, raw AES key or private-key transport was added.
- Registration, grant, standard revoke and strong version rotation still use the user's MetaMask signature, existing contract helpers, receipt checks and backend synchronization.
- Upload stages complete after their actual promises resolve. Successful registration is not shown until the receipt reports success. Local preparation failure, uncertain storage, pending registration, unknown transaction outcome and confirmed-but-unsynchronized registration receive different messages.
- Registration verification and current access are separate from a local plaintext hash comparison. Integrity results describe the last check, not a permanent security guarantee.

## Checks performed

`npm test` passed all three suites:

- Existing frontend crypto regression tests.
- Existing frontend blockchain regression tests.
- New upload-controller tests: a deferred hash cannot advance encryption/upload; original multipart fields and encrypted bytes remain unchanged; hash, encryption, wrap, storage, registration, confirmation, synchronization and reverted-receipt failures cannot report success.

`node --check` passed for modified/new runtime JavaScript and the new test. There are no frontend lint, typecheck or build scripts configured.

Browser checks used installed headless Chrome through its DevTools protocol because agent-browser installation was unavailable. No browser automation dependency was added. Checked:

- Landing, login and workspace at 320, 390, 768, 1024, 1366, 1440 and 1920 pixels. No document-level horizontal overflow. The desktop story intentionally scrolls within its own rail.
- All four existing entry routes, public links and anchor targets.
- Public rendering without a wallet/backend and without JavaScript; workspace/login requirements remain visible without JavaScript.
- Reduced-motion desktop/mobile behavior, 1366 × 480 short viewports and a 720 × 450 layout viewport equivalent to a 1440 × 900 browser at 200% zoom. Native browser zoom was not separately automated.
- Mobile drawer and Escape, modal heading focus/backward Tab trap/Escape/focus restoration, theme switch, all nine workspace views and the mobile Profile route.
- Public seven-stage controls, integrity mismatch/match, rotation sequence and invalid/future access windows.
- Missing MetaMask and unavailable-backend feedback. No runtime JavaScript exceptions occurred in the scripted checks.
- Seven real upload presentation stages, pending hash, reopening an active panel, stored-but-unregistered state, confirmed-but-unsynchronized state, inline failure visibility and released controls after failure. These DOM checks use presentation-only fixtures and do not send requests.
- Existing DEMO_MODE mock KYC, Integrity result, grant, standard revoke, folder create/move and search flows. These validate the existing simulated branch, not live contracts.
- Desktop/mobile screenshots were inspected for the hero, workspace, technology story and architecture section; a mobile menu contrast issue was corrected.

The locked ethers 6.17.0 package was restored locally for its browser bundle and checked against the lockfile's integrity value. The full npm dependency installation did not complete in this environment; test execution and browser loading succeeded. No dependency or lockfile changes were introduced.

## Remaining limitations

### Document-strip follow-up

The document world now has three staggered, independently looping strips. The middle strip runs in reverse. Hover changes only that strip's animation playback rate to 0.22, preserving its position; the hovered document lifts 10px and receives a soft blue glow. Pointer leave restores normal speed. Mobile shows three independently swipeable static strips. Changes are confined to the landing HTML/CSS/JS, the design specification, README, this note and two review screenshots.

Chrome checks confirmed three running tracks with equal-sized loop duplicates, hover rates `[1, 0.22, 1]`, the lift/glow, restored speed on pointer leave, global pause, offscreen pause and reduced motion. All seven requested viewport widths remained free of document overflow. `npm test` and the landing script syntax check passed. See `review/document-strips-desktop.png` and `review/document-strips-mobile.png`.

### Live integration limitations

Successful live MetaMask authentication, authenticated API data, live encrypted upload/decryption, grant/revoke transactions and strong-rotation finalization were not exercised against a running authenticated backend and Sepolia wallet. They retain their existing implementations; browser mocks and unit tests do not establish end-to-end deployment success.

KYC remains mocked. Explicit DEMO_MODE and the public interactive explanations remain simulations. Browser encryption identity/password recovery, durable operation resumption, register-now and automated transaction reconciliation were not added. A recipient may keep previously downloaded plaintext/keys; revocation cannot erase those copies. See the README for these existing security boundaries.

For a deployment smoke test, connect a test wallet with the correct contract/network, authenticate, upload a non-sensitive sample, compare integrity, grant another test wallet time-bounded access, revoke it, then separately exercise strong rotation and verify remaining-recipient access. Also test wallet rejection and a synchronization interruption with a known transaction hash before relying on recovery behavior.
