import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock homedir so CONFIG_DIR/CONFIG_FILE point to our temp dir
const testHome = join(tmpdir(), `s3pull-setup-test-${process.pid}`);
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, homedir: () => testHome };
});

const { setupGlobal, setupLocal } = await import("../lib/setup.mjs");

function createMockPrompt(answers) {
  let idx = 0;
  const fn = async () => answers[idx++] || "";
  fn.close = () => {};
  return fn;
}

describe("setup --global", () => {
  const configDir = join(testHome, ".config", "s3pull");
  const configFile = join(configDir, "config.json");

  beforeEach(async () => {
    await mkdir(testHome, { recursive: true });
  });

  afterEach(async () => {
    await rm(testHome, { recursive: true, force: true });
  });

  it("writes global config.json with all fields", async () => {
    const prompt = createMockPrompt([
      "my-access-key",
      "my-secret-key",
      "https://s3.example.com",
      "my-bucket",
      "eu-central-1",
    ]);

    await setupGlobal(prompt);

    const raw = await readFile(configFile, "utf8");
    const config = JSON.parse(raw);
    expect(config).toEqual({
      accessKey: "my-access-key",
      secretKey: "my-secret-key",
      endpoint: "https://s3.example.com",
      bucket: "my-bucket",
      region: "eu-central-1",
    });
  });

  it("omits region when empty", async () => {
    const prompt = createMockPrompt(["key", "secret", "https://s3.example.com", "bucket", ""]);

    await setupGlobal(prompt);

    const raw = await readFile(configFile, "utf8");
    const config = JSON.parse(raw);
    expect(config.region).toBeUndefined();
    expect(config.accessKey).toBe("key");
  });

  it("creates config directory if it does not exist", async () => {
    const prompt = createMockPrompt(["k", "s", "https://e", "b", ""]);

    await setupGlobal(prompt);

    const raw = await readFile(configFile, "utf8");
    expect(JSON.parse(raw).accessKey).toBe("k");
  });
});

describe("setup (local)", () => {
  let testDir;

  beforeEach(async () => {
    testDir = join(tmpdir(), `s3pull-setup-local-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("writes config section to new s3pull.yml", async () => {
    const prompt = createMockPrompt(["https://fsn1.your-objectstorage.com", "test-bucket", "fsn1"]);

    await setupLocal(testDir, prompt);

    const raw = await readFile(join(testDir, "s3pull.yml"), "utf8");
    const doc = yaml.load(raw);
    expect(doc.config).toEqual({
      endpoint: "https://fsn1.your-objectstorage.com",
      bucket: "test-bucket",
      region: "fsn1",
    });
  });

  it("preserves existing files section in manifest", async () => {
    await writeFile(join(testDir, "s3pull.yml"), "files:\n  - key: existing/file.glb\n");

    const prompt = createMockPrompt(["https://s3.example.com", "my-bucket", ""]);

    await setupLocal(testDir, prompt);

    const raw = await readFile(join(testDir, "s3pull.yml"), "utf8");
    const doc = yaml.load(raw);
    expect(doc.config.endpoint).toBe("https://s3.example.com");
    expect(doc.config.bucket).toBe("my-bucket");
    expect(doc.files).toEqual([{ key: "existing/file.glb" }]);
  });

  it("omits empty fields from config", async () => {
    const prompt = createMockPrompt(["https://s3.example.com", "bucket", ""]);

    await setupLocal(testDir, prompt);

    const raw = await readFile(join(testDir, "s3pull.yml"), "utf8");
    const doc = yaml.load(raw);
    expect(doc.config.region).toBeUndefined();
    expect(doc.config.endpoint).toBe("https://s3.example.com");
  });

  it("overwrites existing config section", async () => {
    await writeFile(
      join(testDir, "s3pull.yml"),
      "config:\n  endpoint: https://old.example.com\n  bucket: old-bucket\nfiles:\n  - key: test.txt\n",
    );

    const prompt = createMockPrompt(["https://new.example.com", "new-bucket", "us-east-1"]);

    await setupLocal(testDir, prompt);

    const raw = await readFile(join(testDir, "s3pull.yml"), "utf8");
    const doc = yaml.load(raw);
    expect(doc.config.endpoint).toBe("https://new.example.com");
    expect(doc.config.bucket).toBe("new-bucket");
    expect(doc.config.region).toBe("us-east-1");
    expect(doc.files).toEqual([{ key: "test.txt" }]);
  });
});
