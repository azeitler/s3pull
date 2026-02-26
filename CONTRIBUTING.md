# Contributing to s3pull

## Prerequisites

- Node.js >= 18
- yarn

## Getting Started

```sh
git clone https://github.com/azeitler/s3pull.git
cd s3pull
yarn install
```

## Development

```sh
# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Lint
yarn lint

# Lint and auto-fix
yarn lint:fix

# Format code
yarn format

# Build (esbuild bundle)
yarn build
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation.

Prefix your commit messages:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `perf:` — performance improvement
- `chore:` — maintenance (hidden from changelog)
- `test:` — adding or updating tests

Examples:

```
feat: add --parallel flag for concurrent downloads
fix: handle ETags with special characters
docs: add Hetzner Object Storage setup guide
```

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Add tests for any new functionality
3. Ensure `yarn lint` and `yarn test` pass
4. Submit a PR with a clear description

## Releases

Releases are automated via [release-please](https://github.com/googleapis/release-please). When conventional commits are pushed to `main`, release-please creates a Release PR with changelog updates and version bumps. Merging the Release PR triggers the release workflow which publishes to npm and creates GitHub Release binaries.
