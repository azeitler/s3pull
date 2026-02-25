import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".config", "s3pull");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const ENV_MAP = {
  accessKey: "S3PULL_ACCESS_KEY",
  secretKey: "S3PULL_SECRET_KEY",
  endpoint: "S3PULL_ENDPOINT",
  bucket: "S3PULL_BUCKET",
  region: "S3PULL_REGION",
};

const REQUIRED = ["accessKey", "secretKey", "endpoint", "bucket"];

function fromEnv() {
  const cfg = {};
  for (const [key, envVar] of Object.entries(ENV_MAP)) {
    if (process.env[envVar]) cfg[key] = process.env[envVar];
  }
  return cfg;
}

async function fromFile() {
  try {
    const raw = await readFile(CONFIG_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function loadConfig() {
  const env = fromEnv();
  const file = await fromFile();
  const merged = { ...file, ...env };

  const missing = REQUIRED.filter((k) => !merged[k]);
  if (missing.length > 0) {
    const envHint = missing.map((k) => `  ${ENV_MAP[k]}=...`).join("\n");
    throw new Error(
      `Missing required config: ${missing.join(", ")}\n\n` +
        `Set environment variables:\n${envHint}\n\n` +
        `Or create ${CONFIG_FILE}:\n` +
        `  ${JSON.stringify(Object.fromEntries(missing.map((k) => [k, "..."])), null, 2)}`
    );
  }

  return merged;
}
