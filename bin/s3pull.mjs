#!/usr/bin/env node

import { createRequire } from "node:module";
import { loadConfig } from "../lib/config.mjs";
import { pullFixture } from "../lib/download.mjs";
import * as log from "../lib/log.mjs";
import { loadManifest, loadManifestConfig } from "../lib/manifest.mjs";
import { createS3Client } from "../lib/s3.mjs";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const args = process.argv.slice(2);

// --version / -v
if (args.includes("--version") || args.includes("-v")) {
  console.log(version);
  process.exit(0);
}

// help / --help / -h (or no args)
if (args.length === 0 || args.includes("--help") || args.includes("-h") || args[0] === "help") {
  console.log(`s3pull v${version}

Usage:
  s3pull <s3-key> [--dest <dir>]   Download a single file from S3
  s3pull all                        Download all files from s3pull.yml
  s3pull --version                  Print version
  s3pull --help                     Show this help

Arguments:
  <s3-key>       S3 object key (e.g. "customer/model.glb")
  --dest <dir>   Destination directory (default: ./fixtures/)

Config (s3pull.yml):
  config:
    endpoint: https://...    S3 endpoint URL
    bucket: my-bucket        S3 bucket name
    region: us-east-1        S3 region (optional)

Environment (override s3pull.yml):
  S3PULL_ACCESS_KEY   S3 access key (required)
  S3PULL_SECRET_KEY   S3 secret key (required)
  S3PULL_ENDPOINT     S3 endpoint URL
  S3PULL_BUCKET       S3 bucket name
  S3PULL_REGION       S3 region (optional)`);
  process.exit(args.length === 0 ? 1 : 0);
}

// Subcommand: all
if (args[0] === "all") {
  async function runAll() {
    try {
      const cwd = process.cwd();
      const manifestCfg = await loadManifestConfig(cwd);
      const config = await loadConfig(manifestCfg);
      const s3 = createS3Client(config);
      const entries = await loadManifest(cwd);

      let downloaded = 0;
      let cached = 0;
      let errors = 0;

      for (const entry of entries) {
        const result = await pullFixture(s3, entry.key, entry.destDir, entry.destName);
        if (result.status === "downloaded") downloaded++;
        else if (result.status === "cached") cached++;
        else errors++;
      }

      log.info("");
      log.info(
        `${entries.length} files: ${downloaded} downloaded, ${cached} cached, ${errors} errors`,
      );

      if (errors > 0) {
        process.exit(1);
      }
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  }
  runAll();
} else {
  // Single file download
  // Parse --dest flag
  let destDir = "./fixtures/";
  const destIdx = args.indexOf("--dest");
  if (destIdx !== -1) {
    destDir = args[destIdx + 1];
    if (!destDir) {
      log.error("--dest requires a directory path");
      process.exit(1);
    }
    args.splice(destIdx, 2);
  }

  const key = args[0];

  async function runSingle() {
    try {
      const manifestCfg = await loadManifestConfig(process.cwd());
      const config = await loadConfig(manifestCfg);
      const s3 = createS3Client(config);
      const result = await pullFixture(s3, key, destDir);

      if (result.status === "error") {
        process.exit(1);
      }
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  }
  runSingle();
}
