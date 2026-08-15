import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(projectDir, "worker-credentials.json");
const username = process.argv[2]?.trim() || "admin";

if (!username || username.length > 80 || /[\r\n:]/.test(username)) {
  throw new Error("The Worker username must contain 1 to 80 characters without colons or line breaks");
}

const credentials = {
  WEB_USERNAME: username,
  WEB_PASSWORD: randomBytes(32).toString("base64url"),
  KEY_ENCRYPTION_SECRET: randomBytes(48).toString("base64"),
};

try {
  await writeFile(outputPath, `${JSON.stringify(credentials, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
} catch (error) {
  if (error?.code === "EEXIST") {
    throw new Error(`Credential file already exists: ${outputPath}`);
  }
  throw error;
}

console.log(`Worker credential file created: ${outputPath}`);
console.log(`Login username: ${username}`);
console.log("The password and encryption secret were not printed.");
