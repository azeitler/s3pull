import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadManifest, loadManifestConfig } from "../lib/manifest.mjs";

describe("manifest", () => {
  let testDir;

  beforeEach(async () => {
    testDir = join(tmpdir(), `s3pull-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("parses a valid manifest with defaults", async () => {
    await writeFile(
      join(testDir, "s3pull.yml"),
      "files:\n  - key: models/scene.glb\n  - key: data/archive.zip\n",
    );

    const entries = await loadManifest(testDir);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      key: "models/scene.glb",
      destDir: "./fixtures/",
      destName: "scene.glb",
    });
    expect(entries[1]).toEqual({
      key: "data/archive.zip",
      destDir: "./fixtures/",
      destName: "archive.zip",
    });
  });

  it("respects custom dest", async () => {
    await writeFile(join(testDir, "s3pull.yml"), "dest: ./test/data/\nfiles:\n  - key: file.bin\n");

    const entries = await loadManifest(testDir);
    expect(entries[0].destDir).toBe("./test/data/");
  });

  it("respects per-entry dest override", async () => {
    await writeFile(
      join(testDir, "s3pull.yml"),
      "files:\n  - key: file.bin\n    dest: ./custom/\n",
    );

    const entries = await loadManifest(testDir);
    expect(entries[0].destDir).toBe("./custom/");
  });

  it("respects as rename", async () => {
    await writeFile(
      join(testDir, "s3pull.yml"),
      "files:\n  - key: customer/model-v2.glb\n    as: model.glb\n",
    );

    const entries = await loadManifest(testDir);
    expect(entries[0].destName).toBe("model.glb");
  });

  it("throws when s3pull.yml does not exist", async () => {
    await expect(loadManifest(testDir)).rejects.toThrow("No s3pull.yml found");
  });

  it("throws when files array is empty", async () => {
    await writeFile(join(testDir, "s3pull.yml"), "files: []\n");

    await expect(loadManifest(testDir)).rejects.toThrow('"files" must be a non-empty array');
  });

  it("throws when files is missing", async () => {
    await writeFile(join(testDir, "s3pull.yml"), "dest: ./out/\n");

    await expect(loadManifest(testDir)).rejects.toThrow('"files" must be a non-empty array');
  });

  it("throws when entry is missing key", async () => {
    await writeFile(join(testDir, "s3pull.yml"), "files:\n  - as: renamed.bin\n");

    await expect(loadManifest(testDir)).rejects.toThrow('missing required "key" field');
  });
});

describe("loadManifestConfig", () => {
  let testDir;

  beforeEach(async () => {
    testDir = join(tmpdir(), `s3pull-test-cfg-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns config section from manifest", async () => {
    await writeFile(
      join(testDir, "s3pull.yml"),
      "config:\n  endpoint: https://s3.example.com\n  bucket: my-bucket\n  region: eu-central-1\nfiles:\n  - key: test.txt\n",
    );

    const cfg = await loadManifestConfig(testDir);
    expect(cfg).toEqual({
      endpoint: "https://s3.example.com",
      bucket: "my-bucket",
      region: "eu-central-1",
    });
  });

  it("returns empty object when no manifest exists", async () => {
    const cfg = await loadManifestConfig(testDir);
    expect(cfg).toEqual({});
  });

  it("returns empty object when manifest has no config section", async () => {
    await writeFile(join(testDir, "s3pull.yml"), "files:\n  - key: test.txt\n");

    const cfg = await loadManifestConfig(testDir);
    expect(cfg).toEqual({});
  });

  it("strips credentials and only returns allowed keys", async () => {
    await writeFile(
      join(testDir, "s3pull.yml"),
      "config:\n  endpoint: https://s3.example.com\n  bucket: my-bucket\n  accessKey: leaked\n  secretKey: leaked\n",
    );

    const cfg = await loadManifestConfig(testDir);
    expect(cfg).toEqual({
      endpoint: "https://s3.example.com",
      bucket: "my-bucket",
    });
    expect(cfg.accessKey).toBeUndefined();
    expect(cfg.secretKey).toBeUndefined();
  });
});
