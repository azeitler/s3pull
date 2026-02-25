#!/usr/bin/env node

import { basename } from "node:path";
import { loadConfig } from "../lib/config.mjs";
import { createS3Client } from "../lib/s3.mjs";
import { loadManifest } from "../lib/manifest.mjs";
import { pullFixture } from "../lib/download.mjs";
import * as log from "../lib/log.mjs";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  const bin = basename(process.argv[1]);
  console.log(`Usage: ${bin}

Pulls all files listed in s3pull.yml from S3.

Reads s3pull.yml from the current directory and downloads
each listed file to its configured destination.

Environment:
  S3PULL_ACCESS_KEY   S3 access key
  S3PULL_SECRET_KEY   S3 secret key
  S3PULL_ENDPOINT     S3 endpoint URL
  S3PULL_BUCKET       S3 bucket name
  S3PULL_REGION       S3 region (optional)`);
  process.exit(0);
}

try {
  const config = await loadConfig();
  const s3 = createS3Client(config);
  const entries = await loadManifest(process.cwd());

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
  log.info(`${entries.length} files: ${downloaded} downloaded, ${cached} cached, ${errors} errors`);

  if (errors > 0) {
    process.exit(1);
  }
} catch (err) {
  log.error(err.message);
  process.exit(1);
}
