#!/usr/bin/env node

import { basename } from "node:path";
import { loadConfig } from "../lib/config.mjs";
import { createS3Client } from "../lib/s3.mjs";
import { pullFixture } from "../lib/download.mjs";
import * as log from "../lib/log.mjs";

const args = process.argv.slice(2);

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

if (!key || key === "--help" || key === "-h") {
  const bin = basename(process.argv[1]);
  console.log(`Usage: ${bin} <s3-key> [--dest <dir>]

Downloads a single file from S3 to a local directory.

Arguments:
  <s3-key>       S3 object key (e.g. "customer/model.glb")
  --dest <dir>   Destination directory (default: ./fixtures/)

Environment:
  S3PULL_ACCESS_KEY   S3 access key
  S3PULL_SECRET_KEY   S3 secret key
  S3PULL_ENDPOINT     S3 endpoint URL
  S3PULL_BUCKET       S3 bucket name
  S3PULL_REGION       S3 region (optional)`);
  process.exit(key ? 0 : 1);
}

try {
  const config = await loadConfig();
  const s3 = createS3Client(config);
  const result = await pullFixture(s3, key, destDir);

  if (result.status === "error") {
    process.exit(1);
  }
} catch (err) {
  log.error(err.message);
  process.exit(1);
}
