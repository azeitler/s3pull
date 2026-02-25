import { mkdir, readFile, writeFile, copyFile, rm, readdir, access } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";

const CACHE_DIR = join(homedir(), ".cache", "s3pull");
const OBJECTS_DIR = join(CACHE_DIR, "objects");
const ETAGS_FILE = join(CACHE_DIR, "etags.json");

function keyHash(key) {
  return createHash("sha256").update(key).digest("hex");
}

function sanitizeEtag(etag) {
  return etag.replace(/[^a-zA-Z0-9-]/g, "_");
}

async function readEtags() {
  try {
    const raw = await readFile(ETAGS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeEtags(data) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(ETAGS_FILE, JSON.stringify(data, null, 2) + "\n");
}

export async function getCachedEtag(key) {
  const etags = await readEtags();
  return etags[key]?.etag || null;
}

export async function getCachedFilePath(key, etag) {
  const dir = join(OBJECTS_DIR, keyHash(key));
  const filePath = join(dir, sanitizeEtag(etag));
  try {
    await access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

export async function writeCacheFromStream(key, etag, size, nodeStream) {
  const dir = join(OBJECTS_DIR, keyHash(key));
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, sanitizeEtag(etag));
  const ws = createWriteStream(filePath);
  await pipeline(nodeStream, ws);

  const etags = await readEtags();
  etags[key] = {
    etag,
    size: size || null,
    cachedAt: new Date().toISOString(),
  };
  await writeEtags(etags);

  return filePath;
}

export async function copyFromCache(cachedPath, destPath) {
  await copyFile(cachedPath, destPath);
}

export async function pruneOldVersions(key, currentEtag) {
  const dir = join(OBJECTS_DIR, keyHash(key));
  const current = sanitizeEtag(currentEtag);
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      if (entry !== current) {
        await rm(join(dir, entry), { force: true });
      }
    }
  } catch {
    // Directory may not exist yet
  }
}
