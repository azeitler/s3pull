#!/usr/bin/env node

import { basename } from "node:path";
import { loadConfig } from "../lib/config.mjs";
import { pullFixture } from "../lib/download.mjs";
import * as log from "../lib/log.mjs";
import { loadManifest, loadManifestConfig } from "../lib/manifest.mjs";
import { createS3Client } from "../lib/s3.mjs";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  const bin = basename(process.argv[1]);
  console.log(`Usage: ${bin}

Pulls all files listed in s3pull.yml from S3.

Reads s3pull.yml from the current directory and downloads
each listed file to its configured destination.

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
  process.exit(0);
}

async function main() {
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

main();
