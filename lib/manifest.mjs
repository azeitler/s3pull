import { readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import yaml from "js-yaml";

const DEFAULT_DEST = "./fixtures/";
const MANIFEST_NAME = "s3pull.yml";

export async function loadManifest(cwd) {
  const manifestPath = join(cwd, MANIFEST_NAME);

  let raw;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    throw new Error(
      `No ${MANIFEST_NAME} found in ${cwd}\n` +
        `Create one with:\n\n` +
        `  files:\n` +
        `    - key: path/to/file.zip\n`
    );
  }

  const doc = yaml.load(raw);
  if (!doc || !Array.isArray(doc.files) || doc.files.length === 0) {
    throw new Error(`${MANIFEST_NAME}: "files" must be a non-empty array`);
  }

  const defaultDest = doc.dest || DEFAULT_DEST;

  return doc.files.map((entry, i) => {
    if (!entry.key) {
      throw new Error(`${MANIFEST_NAME}: entry ${i} is missing required "key" field`);
    }
    return {
      key: entry.key,
      destDir: entry.dest || defaultDest,
      destName: entry.as || basename(entry.key),
    };
  });
}
