import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import yaml from "js-yaml";
import * as log from "./log.mjs";

const DEFAULT_DEST = "./fixtures/";
const MANIFEST_NAME = "s3pull.yml";

const ALLOWED_CONFIG_KEYS = ["endpoint", "bucket", "region"];
const SECRET_KEYS = ["accessKey", "secretKey"];

async function readManifestDoc(cwd) {
  const manifestPath = join(cwd, MANIFEST_NAME);
  const raw = await readFile(manifestPath, "utf8");
  return yaml.load(raw);
}

export async function loadManifestConfig(cwd) {
  let doc;
  try {
    doc = await readManifestDoc(cwd);
  } catch {
    return {};
  }

  if (!doc || !doc.config || typeof doc.config !== "object") {
    return {};
  }

  const cfg = {};
  for (const key of ALLOWED_CONFIG_KEYS) {
    if (doc.config[key]) cfg[key] = doc.config[key];
  }

  for (const key of SECRET_KEYS) {
    if (doc.config[key]) {
      log.warn(
        `${MANIFEST_NAME}: "${key}" should not be in the manifest — use S3PULL_${key.replace(/([A-Z])/g, "_$1").toUpperCase()} env var instead`,
      );
    }
  }

  return cfg;
}

export async function loadManifest(cwd) {
  const manifestPath = join(cwd, MANIFEST_NAME);

  let raw;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    throw new Error(
      `No ${MANIFEST_NAME} found in ${cwd}\n` +
        `Create one with:\n\n` +
        `  files:\n` +
        `    - key: path/to/file.zip\n`,
    );
  }

  const doc = yaml.load(raw);
  if (!doc || !Array.isArray(doc.files) || doc.files.length === 0) {
    throw new Error(`${MANIFEST_NAME}: "files" must be a non-empty array`);
  }

  const defaultDest = doc.dest || DEFAULT_DEST;

  return doc.files.map((entry, i) => {
    if (!entry.key) {
      throw new Error(`${MANIFEST_NAME}: entry ${i} is missing required "key" field`);
    }
    return {
      key: entry.key,
      destDir: entry.dest || defaultDest,
      destName: entry.as || basename(entry.key),
    };
  });
}
