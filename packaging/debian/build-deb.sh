#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

VERSION=$(grep -E '^pkgver=' PKGBUILD | head -n1 | cut -d'=' -f2 | tr -d '[:space:]')
ARCH="amd64"
DEB_DIR="/tmp/deb-wscreensavers"
OUTPUT_DIR="${ROOT_DIR}"

echo "==> Building Debian package for wscreensavers v${VERSION} (${ARCH})..."

# Ensure binary is built
make build

# Prepare staging directory
rm -rf "${DEB_DIR}"
mkdir -p "${DEB_DIR}/DEBIAN"

# Install files using root Makefile
make install DESTDIR="${DEB_DIR}" PREFIX=/usr

# Set up Debian control file
sed "s/^Version:.*/Version: ${VERSION}/" "${SCRIPT_DIR}/control" > "${DEB_DIR}/DEBIAN/control"

# Set permissions
chmod -R u=rwX,go=rX "${DEB_DIR}"
chmod 755 "${DEB_DIR}/DEBIAN"
chmod 644 "${DEB_DIR}/DEBIAN/control"

# Build .deb
if command -v dpkg-deb >/dev/null 2>&1; then
    dpkg-deb --build --root-owner-group "${DEB_DIR}" "${OUTPUT_DIR}/wscreensavers_${VERSION}_${ARCH}.deb"
    echo "==> Successfully generated: ${OUTPUT_DIR}/wscreensavers_${VERSION}_${ARCH}.deb"
else
    echo "ERROR: dpkg-deb is not installed on this system." >&2
    exit 1
fi
