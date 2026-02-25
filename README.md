# s3pull

Thin CLI to download files from S3-compatible storage with ETag-based local caching and YAML manifest support.

Works with any S3-compatible backend: AWS S3, Hetzner Object Storage, MinIO, DigitalOcean Spaces, etc.

## Install

```sh
npm install -g s3pull
# or per-project
yarn add --dev s3pull
```

## Quick Start

```sh
# Download a single file
s3pull "models/scene.glb"
# → ./fixtures/scene.glb

# Download to a specific directory
s3pull "data/archive.zip" --dest ./test/data/

# Download all files listed in s3pull.yml
s3pull-all
```

## Configuration

### Environment Variables

```sh
export S3PULL_ACCESS_KEY="your-access-key"
export S3PULL_SECRET_KEY="your-secret-key"
export S3PULL_ENDPOINT="https://fsn1.your-objectstorage.com"
export S3PULL_BUCKET="my-bucket"
export S3PULL_REGION="fsn1"  # optional
```

### Config File

Alternatively, create `~/.config/s3pull/config.json`:

```json
{
  "accessKey": "your-access-key",
  "secretKey": "your-secret-key",
  "endpoint": "https://fsn1.your-objectstorage.com",
  "bucket": "my-bucket",
  "region": "fsn1"
}
```

Environment variables take precedence over the config file.

## Manifest: `s3pull.yml`

Create `s3pull.yml` in your project root to declare which files are needed:

```yaml
# Default destination directory (optional, defaults to ./fixtures/)
dest: ./fixtures/

files:
  - key: customer-a/model.glb

  - key: customer-a/textures.zip
    as: textures-a.zip           # rename on download

  - key: customer-b/assembly.step
    dest: ./test/cad-fixtures/   # per-entry destination override
```

Then run:

```sh
s3pull-all
```

### Schema

| Field | Required | Default | Description |
|---|---|---|---|
| `dest` | no | `./fixtures/` | Default destination directory |
| `files[].key` | yes | — | S3 object key |
| `files[].as` | no | basename of key | Local filename override |
| `files[].dest` | no | top-level `dest` | Per-entry destination directory |

## Caching

Downloaded files are cached locally at `~/.cache/s3pull/`. Before downloading, `s3pull` sends a HEAD request to check the remote ETag. If the cached ETag matches, the file is copied from cache instead of re-downloading.

This means:
- First run downloads everything
- Subsequent runs are near-instant (cache hits)
- When a remote file changes, only that file is re-downloaded

The cache is shared across all projects on the same machine.

## CI / GitHub Actions

```yaml
- name: Cache s3pull files
  uses: actions/cache@v4
  with:
    path: ~/.cache/s3pull
    key: s3pull-${{ hashFiles('s3pull.yml') }}
    restore-keys: s3pull-

- name: Pull test fixtures
  run: yarn s3pull-all
  env:
    S3PULL_ACCESS_KEY: ${{ secrets.S3PULL_ACCESS_KEY }}
    S3PULL_SECRET_KEY: ${{ secrets.S3PULL_SECRET_KEY }}
    S3PULL_ENDPOINT: https://fsn1.your-objectstorage.com
    S3PULL_BUCKET: my-fixtures
```

## Don't forget `.gitignore`

```
fixtures/
```

## License

MIT
