import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AccountService } from "./src/account-service.js";
import { readConfig } from "./src/config.js";
import { createHttpServer } from "./src/http-server.js";
import { EncryptedKeyStore } from "./src/key-store.js";

const config = readConfig();
const currentDir = dirname(fileURLToPath(import.meta.url));
const keyStore = new EncryptedKeyStore({
  filePath: join(config.dataDir, "keys.enc.json"),
  secret: config.keyEncryptionSecret,
});
await keyStore.init();
const accountService = new AccountService({ config, keyStore });
const server = createHttpServer({
  config,
  accountService,
  publicDir: join(currentDir, "public"),
});

server.listen(config.port, config.host, () => {
  console.log(`OpenCode Go Balance is listening on http://${config.host}:${config.port}`);
  if (!accountService.configured) console.warn("No OpenCode Go accounts are configured; add one from /admin.");
  if (!config.webUsername) console.warn("Web authentication is disabled. Protect the service before exposing it publicly.");
  if (!accountService.adminEnabled) console.warn("Account management is disabled. Configure web authentication and KEY_ENCRYPTION_SECRET.");
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  server.close((error) => {
    if (error) {
      console.error("Failed to close the HTTP server", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
