import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AccountService } from "../src/account-service.js";
import { createHttpServer } from "../src/http-server.js";
import { EncryptedKeyStore } from "../src/key-store.js";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const runtimeDir = join(projectDir, ".local-runtime");
const dataDir = join(runtimeDir, "data");
const configPath = join(runtimeDir, "preview-config.json");

async function loadRuntimeConfig() {
  await mkdir(dataDir, { recursive: true });
  try {
    const stored = JSON.parse(await readFile(configPath, "utf8"));
    if (typeof stored.webPassword !== "string" || stored.webPassword.length < 32) throw new Error("invalid password");
    if (typeof stored.keyEncryptionSecret !== "string" || stored.keyEncryptionSecret.length < 32) throw new Error("invalid secret");
    return stored;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw new Error(`Unable to read ${configPath}. Restore the original file before starting the preview.`, { cause: error });
    }
  }

  const stored = {
    webUsername: "local-admin",
    webPassword: randomBytes(32).toString("base64url"),
    keyEncryptionSecret: randomBytes(48).toString("base64"),
  };
  const temporaryPath = `${configPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(stored, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, configPath);
  return stored;
}

const stored = await loadRuntimeConfig();
const config = Object.freeze({
  apiKey: "",
  usageUrl: "https://opencode.ai/zen/go/v1/usage",
  modelTestUrl: "https://opencode.ai/zen/go/v1/chat/completions",
  modelListUrl: "https://opencode.ai/zen/go/v1/models",
  modelTestModel: "hy3",
  timeoutMs: 15000,
  cacheTtlMs: 30000,
  refreshIntervalMs: 30000,
  warnPercent: 60,
  dangerPercent: 85,
  webUsername: stored.webUsername,
  webPassword: stored.webPassword,
  keyEncryptionSecret: stored.keyEncryptionSecret,
  dataDir,
});

const keyStore = new EncryptedKeyStore({ filePath: join(dataDir, "keys.enc.json"), secret: config.keyEncryptionSecret });
await keyStore.init();
const accountService = new AccountService({ config, keyStore });
const app = createHttpServer({ config, accountService, publicDir: join(projectDir, "public") });
await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));

const authorization = `Basic ${Buffer.from(`${config.webUsername}:${config.webPassword}`).toString("base64")}`;
const proxy = createServer(async (request, response) => {
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const headers = { ...request.headers, authorization };
    delete headers.host;
    delete headers["content-length"];
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const target = `http://127.0.0.1:${app.address().port}${request.url}`;
    const proxied = await fetch(target, { method: request.method, headers, body, redirect: "manual" });
    const payload = Buffer.from(await proxied.arrayBuffer());
    response.writeHead(proxied.status, Object.fromEntries(proxied.headers)).end(payload);
  } catch (error) {
    response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: { code: "local_proxy_error", message: error.message } }));
  }
});

await new Promise((resolve, reject) => {
  proxy.once("error", reject);
  proxy.listen(57726, "127.0.0.1", resolve);
});

console.log("Local persistent preview is listening on http://127.0.0.1:57726/");
console.log(`Runtime data: ${runtimeDir}`);

async function close() {
  await new Promise((resolve) => proxy.close(resolve));
  await new Promise((resolve) => app.close(resolve));
  process.exit(0);
}

process.once("SIGINT", close);
process.once("SIGTERM", close);
await new Promise(() => {});
