#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

VERSION=$(grep -E '^pkgver=' PKGBUILD | head -n1 | cut -d'=' -f2 | tr -d '[:space:]')
APP_DIR="/tmp/wscreensavers.AppDir"
OUTPUT_FILE="${ROOT_DIR}/wscreensavers-${VERSION}-x86_64.AppImage"

echo "==> Staging AppDir for wscreensavers v${VERSION}..."

make build

rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}/usr"

make install DESTDIR="${APP_DIR}" PREFIX=/usr

cp "${SCRIPT_DIR}/AppRun" "${APP_DIR}/AppRun"
chmod +x "${APP_DIR}/AppRun"

cp "${APP_DIR}/usr/share/applications/wscreensavers.desktop" "${APP_DIR}/"
cp "${APP_DIR}/usr/share/icons/hicolor/scalable/apps/wscreensavers.svg" "${APP_DIR}/wscreensavers.svg"

# If librsvg is present, generate a standard png icon as well
if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w 256 -h 256 "${APP_DIR}/wscreensavers.svg" -o "${APP_DIR}/wscreensavers.png"
fi

# Acquire appimagetool if not on system
TOOL="appimagetool"
if ! command -v appimagetool >/dev/null 2>&1; then
    CACHE_TOOL="/tmp/appimagetool-x86_64.AppImage"
    if [ ! -f "${CACHE_TOOL}" ]; then
        echo "==> Fetching appimagetool..."
        curl -sL "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage" -o "${CACHE_TOOL}"
        chmod +x "${CACHE_TOOL}"
    fi
    TOOL="${CACHE_TOOL}"
fi

echo "==> Building AppImage..."
ARCH=x86_64 "${TOOL}" --appimage-extract-and-run "${APP_DIR}" "${OUTPUT_FILE}"
echo "✔ Successfully generated: ${OUTPUT_FILE}"
