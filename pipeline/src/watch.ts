import chokidar from "chokidar";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VAULT = path.join(ROOT, "vault");

console.log("watching", VAULT);
chokidar.watch(VAULT, { ignoreInitial: false }).on("all", async () => {
  try { await build(); console.log("rebuilt", new Date().toLocaleTimeString()); }
  catch (e) { console.error(e); }
});
