import { copyFileSync, existsSync, lstatSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(fileURLToPath(new URL("../frontend/", import.meta.url)));
const output = resolve(root, "dist");
const files = [
  "index.html", "styles.css", "tokens.css", "favicon.svg", "runtime-config.js",
  "api.js", "crypto.js", "blockchain-config.js", "blockchain.js", "app.js", "presentation.js",
  "KryptoVaultAccess.abi.json", "README.md", "REDESIGN_NOTES.md",
  "landing_page/index.html", "landing_page/login.html", "landing_page/styles.css",
  "landing_page/login.css", "landing_page/script.js", "landing_page/sphere-geometry.js",
  "landing_page/sphere.svg", "node_modules/ethers/dist/ethers.umd.min.js"
];
for (const file of files) {
  if (!existsSync(join(root, file))) throw new Error(`Missing frontend build input: ${file}`);
}
// Clean only this dedicated output; refuse symlinks before recursive removal.
if (dirname(output) !== root || (existsSync(output) && lstatSync(output).isSymbolicLink())) {
  throw new Error("Unsafe frontend output directory");
}
rmSync(output, { recursive: true, force: true });
for (const file of files) {
  const destination = join(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(root, file), destination);
}
console.log(`Production frontend built: ${files.length} public files; no environment or review files.`);
