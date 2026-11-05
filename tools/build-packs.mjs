/**
 * Compile les sources JSON (src/packs/*) en compendiums LevelDB (packs/*).
 * Usage : npm install && npm run build:packs
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const SRC = "src/packs";
for (const name of readdirSync(SRC)) {
  const out = join("packs", name);
  rmSync(out, { recursive: true, force: true });
  await compilePack(join(SRC, name), out, { log: false });
  console.log(`Compendium compilé : ${name}`);
}
