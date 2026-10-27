#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

echo "==> Checking Snapcraft environment..."

if ! command -v snapcraft >/dev/null 2>&1; then
    echo "NOTICE: 'snapcraft' is not installed on this host."
    echo "The Snapcraft manifest is ready at: ${SCRIPT_DIR}/snapcraft.yaml"
    echo "To build on a system with snapcraft (or via GitHub Actions):"
    echo "  cp packaging/snap/snapcraft.yaml snapcraft.yaml && snapcraft"
    exit 0
fi

cleanup() {
    rm -f "${ROOT_DIR}/snapcraft.yaml"
}
trap cleanup EXIT

cp "${SCRIPT_DIR}/snapcraft.yaml" "${ROOT_DIR}/snapcraft.yaml"

echo "==> Building Snap package from repository root..."
snapcraft "$@"
echo "==> Snap build complete."
