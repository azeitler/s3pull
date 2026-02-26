import { beforeEach, describe, expect, it, vi } from "vitest";
import * as log from "../lib/log.mjs";

describe("log", () => {
  let written;

  beforeEach(() => {
    written = "";
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      written += chunk;
      return true;
    });
  });

  it("info writes to stderr", () => {
    log.info("test message");
    expect(written).toContain("s3pull");
    expect(written).toContain("test message");
    expect(written).toContain("\n");
  });

  it("success writes to stderr", () => {
    log.success("done");
    expect(written).toContain("done");
  });

  it("warn writes to stderr", () => {
    log.warn("careful");
    expect(written).toContain("careful");
  });

  it("error writes to stderr", () => {
    log.error("failed");
    expect(written).toContain("failed");
  });
});
