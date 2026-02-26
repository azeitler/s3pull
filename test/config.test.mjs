import { afterEach, beforeEach, describe, expect, it } from "vitest";

// We need to mock the config file path, so we test loadConfig indirectly
// by controlling env vars and verifying behavior.

describe("config", () => {
  const savedEnv = {};
  const envKeys = [
    "S3PULL_ACCESS_KEY",
    "S3PULL_SECRET_KEY",
    "S3PULL_ENDPOINT",
    "S3PULL_BUCKET",
    "S3PULL_REGION",
  ];

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it("reads all config from environment variables", async () => {
    process.env.S3PULL_ACCESS_KEY = "test-key";
    process.env.S3PULL_SECRET_KEY = "test-secret";
    process.env.S3PULL_ENDPOINT = "https://s3.example.com";
    process.env.S3PULL_BUCKET = "test-bucket";
    process.env.S3PULL_REGION = "eu-central-1";

    const { loadConfig } = await import("../lib/config.mjs");
    const config = await loadConfig();

    expect(config.accessKey).toBe("test-key");
    expect(config.secretKey).toBe("test-secret");
    expect(config.endpoint).toBe("https://s3.example.com");
    expect(config.bucket).toBe("test-bucket");
    expect(config.region).toBe("eu-central-1");
  });

  it("throws with clear message when required keys are missing", async () => {
    const { loadConfig } = await import("../lib/config.mjs");
    await expect(loadConfig()).rejects.toThrow("Missing required config");
    await expect(loadConfig()).rejects.toThrow("S3PULL_ACCESS_KEY");
  });

  it("does not require region", async () => {
    process.env.S3PULL_ACCESS_KEY = "key";
    process.env.S3PULL_SECRET_KEY = "secret";
    process.env.S3PULL_ENDPOINT = "https://s3.example.com";
    process.env.S3PULL_BUCKET = "bucket";

    const { loadConfig } = await import("../lib/config.mjs");
    const config = await loadConfig();

    expect(config.accessKey).toBe("key");
    expect(config.region).toBeUndefined();
  });
});
