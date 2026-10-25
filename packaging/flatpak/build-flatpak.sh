#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

BUILD_DIR="/tmp/flatpak-wscreensavers-build"
REPO_DIR="/tmp/flatpak-wscreensavers-repo"

echo "==> Checking Flatpak builder environment..."

if ! command -v flatpak-builder >/dev/null 2>&1; then
    echo "NOTICE: 'flatpak-builder' is not installed on this host."
    echo "The Flatpak manifest is ready at: ${SCRIPT_DIR}/com.github.chrisfair.wscreensavers.yml"
    echo "To build on a system with flatpak-builder:"
    echo "  flatpak-builder --force-clean --user --install-deps-from=flathub ${BUILD_DIR} ${SCRIPT_DIR}/com.github.chrisfair.wscreensavers.yml"
    exit 0
fi

echo "==> Building Flatpak package..."
flatpak-builder --force-clean --repo="${REPO_DIR}" "${BUILD_DIR}" "${SCRIPT_DIR}/com.github.chrisfair.wscreensavers.yml"
echo "==> Flatpak build complete."
