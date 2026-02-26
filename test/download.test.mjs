import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@smithy/util-stream";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Must use a hoisted variable for vi.mock (vi.mock is hoisted above all imports)
const testHome = join(tmpdir(), `s3pull-dl-test-${process.pid}`);

vi.mock("node:os", async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => testHome };
});

// Dynamic import after mock is set up
const { createS3Client } = await import("../lib/s3.mjs");
const { pullFixture } = await import("../lib/download.mjs");

const s3Mock = mockClient(S3Client);

describe("download", () => {
  let destDir;

  beforeEach(async () => {
    s3Mock.reset();
    destDir = join(testHome, "fixtures");
    await mkdir(testHome, { recursive: true });
  });

  afterEach(async () => {
    await rm(testHome, { recursive: true, force: true });
  });

  function makeS3() {
    return createS3Client({
      accessKey: "test",
      secretKey: "test",
      endpoint: "https://s3.example.com",
      bucket: "test-bucket",
    });
  }

  function mockStream(content) {
    const stream = new Readable();
    stream.push(content);
    stream.push(null);
    return sdkStreamMixin(stream);
  }

  it("downloads a file and returns downloaded status", async () => {
    s3Mock.on(HeadObjectCommand).resolves({ ETag: '"abc123"', ContentLength: 11 });
    s3Mock.on(GetObjectCommand).resolves({ Body: mockStream("hello world") });

    const result = await pullFixture(makeS3(), "test/file.txt", destDir);

    expect(result.status).toBe("downloaded");
    expect(result.key).toBe("test/file.txt");

    const content = await readFile(join(destDir, "file.txt"), "utf8");
    expect(content).toBe("hello world");
  });

  it("serves from cache on second pull", async () => {
    // First download
    s3Mock.on(HeadObjectCommand).resolves({ ETag: '"etag1"', ContentLength: 4 });
    s3Mock.on(GetObjectCommand).resolves({ Body: mockStream("data") });

    await pullFixture(makeS3(), "cache/test.bin", destDir);

    // Second pull - same ETag
    s3Mock.reset();
    s3Mock.on(HeadObjectCommand).resolves({ ETag: '"etag1"', ContentLength: 4 });

    const result = await pullFixture(makeS3(), "cache/test.bin", destDir);
    expect(result.status).toBe("cached");

    // GetObject should not have been called on second pull
    expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(0);
  });

  it("returns error status for 404", async () => {
    const notFoundError = new Error("NotFound");
    notFoundError.name = "NotFound";
    notFoundError.$metadata = { httpStatusCode: 404 };
    s3Mock.on(HeadObjectCommand).rejects(notFoundError);

    const result = await pullFixture(makeS3(), "missing/file.txt", destDir);
    expect(result.status).toBe("error");
    expect(result.error).toBe("not found");
  });

  it("uses custom destName when provided", async () => {
    s3Mock.on(HeadObjectCommand).resolves({ ETag: '"e1"', ContentLength: 3 });
    s3Mock.on(GetObjectCommand).resolves({ Body: mockStream("abc") });

    const result = await pullFixture(makeS3(), "path/original.glb", destDir, "renamed.glb");

    expect(result.dest).toBe(join(destDir, "renamed.glb"));
    const content = await readFile(join(destDir, "renamed.glb"), "utf8");
    expect(content).toBe("abc");
  });
});
