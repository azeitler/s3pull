#!/bin/bash
set -euo pipefail

NAME="$1"
PLATFORM="${2:-$(uname -s | tr '[:upper:]' '[:lower:]')}"

# Map platform names
case "$PLATFORM" in
  darwin|macos) PLATFORM="darwin" ;;
  linux) PLATFORM="linux" ;;
  win32|windows*|MINGW*|MSYS*) PLATFORM="win32" ;;
esac

echo "Building SEA binary: $NAME for $PLATFORM"

# Generate the blob
node --experimental-sea-config "sea-config-${NAME}.json"

# Copy the node binary
if [ "$PLATFORM" = "win32" ]; then
  cp "$(command -v node)" "dist/${NAME}.exe"
else
  cp "$(command -v node)" "dist/${NAME}"
fi

# Inject the blob
if [ "$PLATFORM" = "darwin" ]; then
  codesign --remove-signature "dist/${NAME}"
  npx postject "dist/${NAME}" NODE_SEA_BLOB "dist/${NAME}-sea-prep.blob" \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA
  codesign --sign - "dist/${NAME}"
elif [ "$PLATFORM" = "win32" ]; then
  npx postject "dist/${NAME}.exe" NODE_SEA_BLOB "dist/${NAME}-sea-prep.blob" \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
else
  npx postject "dist/${NAME}" NODE_SEA_BLOB "dist/${NAME}-sea-prep.blob" \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
fi

echo "Built dist/${NAME}$([ "$PLATFORM" = "win32" ] && echo ".exe" || echo "")"
