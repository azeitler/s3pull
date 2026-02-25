import { mkdir } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  getCachedEtag,
  getCachedFilePath,
  writeCacheFromStream,
  copyFromCache,
  pruneOldVersions,
} from "./cache.mjs";
import * as log from "./log.mjs";

export async function pullFixture(s3, key, destDir, destName) {
  const { client, bucket } = s3;
  const fileName = destName || basename(key);
  const destPath = join(destDir, fileName);

  // 1. Get remote ETag via HEAD request
  let remoteEtag, remoteSize;
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    remoteEtag = head.ETag;
    remoteSize = head.ContentLength;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      log.error(`not found: ${key}`);
      return { status: "error", key, dest: destPath, error: "not found" };
    }
    throw err;
  }

  // 2. Check local cache
  const localEtag = await getCachedEtag(key);
  if (localEtag === remoteEtag) {
    const cachedPath = await getCachedFilePath(key, remoteEtag);
    if (cachedPath) {
      await mkdir(dirname(destPath), { recursive: true });
      await copyFromCache(cachedPath, destPath);
      log.success(`cached   ${key} → ${destPath}`);
      return { status: "cached", key, dest: destPath, size: remoteSize };
    }
  }

  // 3. Download from S3
  log.info(`downloading ${key} ...`);
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  await mkdir(dirname(destPath), { recursive: true });
  const cachedPath = await writeCacheFromStream(key, remoteEtag, remoteSize, response.Body);
  await copyFromCache(cachedPath, destPath);
  await pruneOldVersions(key, remoteEtag);

  log.success(`downloaded ${key} → ${destPath}`);
  return { status: "downloaded", key, dest: destPath, size: remoteSize };
}
