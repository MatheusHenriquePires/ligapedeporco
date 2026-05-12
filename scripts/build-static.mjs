import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(rootDir, "public");
const outDir = join(rootDir, "out");

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

mkdirSync(outDir, { recursive: true });
cpSync(publicDir, outDir, { recursive: true });
cpSync(join(publicDir, "liga-pe-de-porco.html"), join(outDir, "index.html"));

writeFileSync(join(outDir, "_redirects"), "/* /index.html 200\n");
