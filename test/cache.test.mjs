import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock homedir so cache goes to a temp dir
const testHome = join(tmpdir(), `s3pull-cache-test-${Date.now()}`);
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, homedir: () => testHome };
});

const { getCachedEtag, getCachedFilePath, writeCacheFromStream, copyFromCache, pruneOldVersions } =
  await import("../lib/cache.mjs");

describe("cache", () => {
  beforeEach(async () => {
    await mkdir(testHome, { recursive: true });
  });

  afterEach(async () => {
    await rm(testHome, { recursive: true, force: true });
  });

  it("returns null for unknown key", async () => {
    const etag = await getCachedEtag("nonexistent/key");
    expect(etag).toBeNull();
  });

  it("writes and reads cache entry", async () => {
    const stream = Readable.from(Buffer.from("test content"));
    await writeCacheFromStream("test/file.txt", '"abc123"', 12, stream);

    const etag = await getCachedEtag("test/file.txt");
    expect(etag).toBe('"abc123"');
  });

  it("returns cached file path when file exists", async () => {
    const stream = Readable.from(Buffer.from("hello"));
    await writeCacheFromStream("path/to/file.bin", '"etag1"', 5, stream);

    const path = await getCachedFilePath("path/to/file.bin", '"etag1"');
    expect(path).not.toBeNull();

    const content = await readFile(path, "utf8");
    expect(content).toBe("hello");
  });

  it("returns null when cached file does not exist", async () => {
    const path = await getCachedFilePath("missing/file", '"noetag"');
    expect(path).toBeNull();
  });

  it("copies from cache to destination", async () => {
    const stream = Readable.from(Buffer.from("data"));
    const cachedPath = await writeCacheFromStream("key", '"e1"', 4, stream);

    const destDir = join(testHome, "dest");
    await mkdir(destDir, { recursive: true });
    const destPath = join(destDir, "output.bin");
    await copyFromCache(cachedPath, destPath);

    const content = await readFile(destPath, "utf8");
    expect(content).toBe("data");
  });

  it("prunes old versions keeping current", async () => {
    // Write two versions
    const s1 = Readable.from(Buffer.from("v1"));
    await writeCacheFromStream("prune/test", '"old-etag"', 2, s1);

    const s2 = Readable.from(Buffer.from("v2"));
    await writeCacheFromStream("prune/test", '"new-etag"', 2, s2);

    // Prune old
    await pruneOldVersions("prune/test", '"new-etag"');

    // New should exist, old should not
    const newPath = await getCachedFilePath("prune/test", '"new-etag"');
    expect(newPath).not.toBeNull();

    const oldPath = await getCachedFilePath("prune/test", '"old-etag"');
    expect(oldPath).toBeNull();
  });
});
