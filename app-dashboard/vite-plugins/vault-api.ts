import type { Plugin } from "vite";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setMistakeGroup, createMaterialStub, createMistake } from "../../pipeline/src/write";

const VAULT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../vault");

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function vaultApiPlugin(): Plugin {
  return {
    name: "vault-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/") || req.method !== "POST") {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        try {
          const groupMatch = req.url.match(/^\/api\/mistakes\/([^/]+)\/group$/);
          if (groupMatch) {
            const body = await readJsonBody(req);
            await setMistakeGroup(VAULT, decodeURIComponent(groupMatch[1]), body.group as 1 | 2);
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          if (req.url === "/api/materials") {
            const body = await readJsonBody(req);
            const result = await createMaterialStub(VAULT, body.subject as any, body.title as string);
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url === "/api/mistakes") {
            const body = await readJsonBody(req);
            const result = await createMistake(VAULT, body as any);
            res.end(JSON.stringify(result));
            return;
          }
          next();
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    },
  };
}
