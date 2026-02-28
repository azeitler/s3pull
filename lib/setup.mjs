import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import yaml from "js-yaml";
import { CONFIG_DIR, CONFIG_FILE } from "./config.mjs";
import * as log from "./log.mjs";

const MANIFEST_NAME = "s3pull.yml";

function createPromptFn() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (question, defaultValue, secret = false) => {
    const suffix = defaultValue ? (secret ? " [****]" : ` [${defaultValue}]`) : "";
    return new Promise((resolve) => {
      rl.question(`${question}${suffix}: `, (answer) => {
        resolve(answer.trim() || defaultValue || "");
      });
    });
  };

  prompt.close = () => rl.close();
  return prompt;
}

async function loadExistingGlobalConfig() {
  try {
    const raw = await readFile(CONFIG_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function loadExistingManifest(cwd) {
  try {
    const raw = await readFile(join(cwd, MANIFEST_NAME), "utf8");
    return yaml.load(raw) || {};
  } catch {
    return {};
  }
}

export async function setupGlobal(prompt) {
  const existing = await loadExistingGlobalConfig();

  log.info(`Global setup — saves to ${CONFIG_FILE}`);
  log.info("");

  const accessKey = await prompt("S3 access key", existing.accessKey);
  const secretKey = await prompt("S3 secret key", existing.secretKey, true);
  const endpoint = await prompt("S3 endpoint URL", existing.endpoint);
  const bucket = await prompt("S3 bucket name", existing.bucket);
  const region = await prompt("S3 region (optional)", existing.region);

  const config = { accessKey, secretKey, endpoint, bucket };
  if (region) config.region = region;

  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);

  log.info("");
  log.success(`Config saved to ${CONFIG_FILE}`);
}

export async function setupLocal(cwd, prompt) {
  const doc = await loadExistingManifest(cwd);
  const existingConfig = doc.config || {};

  log.info(`Local setup — saves to ./${MANIFEST_NAME}`);
  log.info("");

  const endpoint = await prompt("S3 endpoint URL", existingConfig.endpoint);
  const bucket = await prompt("S3 bucket name", existingConfig.bucket);
  const region = await prompt("S3 region (optional)", existingConfig.region);

  const config = {};
  if (endpoint) config.endpoint = endpoint;
  if (bucket) config.bucket = bucket;
  if (region) config.region = region;

  doc.config = config;

  const output = yaml.dump(doc, { lineWidth: -1, noRefs: true });
  await writeFile(join(cwd, MANIFEST_NAME), output);

  log.info("");
  log.success(`Config saved to ./${MANIFEST_NAME}`);
  log.info("");
  log.info("Set credentials via environment variables:");
  log.info("  export S3PULL_ACCESS_KEY=...");
  log.info("  export S3PULL_SECRET_KEY=...");
}

export async function runSetup(args) {
  const isGlobal = args.includes("--global") || args.includes("-g");
  const prompt = createPromptFn();

  try {
    if (isGlobal) {
      await setupGlobal(prompt);
    } else {
      await setupLocal(process.cwd(), prompt);
    }
  } finally {
    prompt.close();
  }
}
