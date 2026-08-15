import { WorkerError } from "./errors.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const KEY_INFO_PREFIX = "opencode-go-balance:worker-key:v1:";

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function base64Url(bytes) {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function requireMasterSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new WorkerError("key_store_disabled", "KEY_ENCRYPTION_SECRET must contain at least 32 characters", 503);
  }
}

async function deriveEncryptionKey(secret, accountId, salt, usage) {
  requireMasterSecret(secret);
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({
    name: "HKDF",
    hash: "SHA-256",
    salt,
    info: encoder.encode(`${KEY_INFO_PREFIX}${accountId}`),
  }, material, { name: "AES-GCM", length: 256 }, false, [usage]);
}

export async function encryptApiKey(secret, accountId, apiKey) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(secret, accountId, salt, "encrypt");
  const ciphertext = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv,
    additionalData: encoder.encode(accountId),
  }, key, encoder.encode(apiKey));
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

export async function decryptApiKey(secret, accountId, encrypted) {
  try {
    const salt = base64ToBytes(encrypted.salt);
    const iv = base64ToBytes(encrypted.iv);
    const key = await deriveEncryptionKey(secret, accountId, salt, "decrypt");
    const plaintext = await crypto.subtle.decrypt({
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode(accountId),
    }, key, base64ToBytes(encrypted.ciphertext));
    return decoder.decode(plaintext);
  } catch (error) {
    if (error instanceof WorkerError) throw error;
    throw new WorkerError("key_decryption_failed", "Unable to decrypt the stored API key", 500);
  }
}

export async function fingerprintApiKey(secret, apiKey) {
  requireMasterSecret(secret);
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
    name: "HMAC",
    hash: "SHA-256",
  }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(apiKey))));
}

export async function secureEqual(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(leftHash, rightHash);
  }
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}
