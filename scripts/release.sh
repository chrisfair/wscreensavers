#!/usr/bin/env bash
set -euo pipefail

# Release automation script for WScreenSavers
# Enforces the AUR SHA256 integrity protocol, cross-packaging version bumps,
# binary asset compilation, AUR publishing, and GitHub Release deployment.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

if [ $# -lt 1 ]; then
    CURRENT_VER=$(grep -E '^pkgver=' PKGBUILD | cut -d'=' -f2 | tr -d '[:space:]')
    echo "Usage: $0 <new-version> (e.g., $0 1.0.28)"
    echo "Current version: ${CURRENT_VER}"
    exit 1
fi

NEW_VER="$1"
CURRENT_VER=$(grep -E '^pkgver=' PKGBUILD | cut -d'=' -f2 | tr -d '[:space:]')

if [[ ! "${NEW_VER}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in semver format X.Y.Z (got: ${NEW_VER})"
    exit 1
fi

echo "=========================================================="
echo " Preparing WScreenSavers Release: v${CURRENT_VER} -> v${NEW_VER}"
echo "=========================================================="

# Ensure clean working directory
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Git working tree is dirty. Commit or stash changes before releasing."
    git status -s
    exit 1
fi

echo "==> Running quality checks & tests..."
make test

echo "==> Bumping version to ${NEW_VER} across all 8 package manifests..."

# 1. PKGBUILD
sed -i "s/^pkgver=.*/pkgver=${NEW_VER}/" PKGBUILD

# 2. flake.nix
sed -i "s/version = \"${CURRENT_VER}\";/version = \"${NEW_VER}\";/" flake.nix

# 3. packaging/debian/control
sed -i "s/^Version: .*/Version: ${NEW_VER}/" packaging/debian/control

# 4. packaging/rpm/wscreensavers.spec
sed -i "s/^Version: .*/Version:        ${NEW_VER}/" packaging/rpm/wscreensavers.spec

# 5. packaging/slackware/wscreensavers.info
sed -i "s/^VERSION=.*/VERSION=\"${NEW_VER}\"/" packaging/slackware/wscreensavers.info
sed -i "s/v${CURRENT_VER}\.tar\.gz/v${NEW_VER}.tar.gz/" packaging/slackware/wscreensavers.info

# 6. packaging/slackware/wscreensavers.SlackBuild
sed -i "s/VERSION=\${VERSION:-${CURRENT_VER}}/VERSION=\${VERSION:-${NEW_VER}}/" packaging/slackware/wscreensavers.SlackBuild

# 7. packaging/flatpak/com.github.chrisfair.wscreensavers.yml
sed -i "s/tag: v${CURRENT_VER}/tag: v${NEW_VER}/" packaging/flatpak/com.github.chrisfair.wscreensavers.yml

# 8. packaging/snap/snapcraft.yaml
sed -i "s/^version: .*/version: '${NEW_VER}'/" packaging/snap/snapcraft.yaml

# 9. wscreensavers.1 man page
sed -i "s/\"wscreensavers [0-9.]*\"/\"wscreensavers ${NEW_VER}\"/" wscreensavers.1

echo "==> All packaging manifests and man page updated to v${NEW_VER}"

echo "==> Committing version bump to main..."
git add PKGBUILD flake.nix packaging/ wscreensavers.1
git commit -m "chore(release): bump version to ${NEW_VER}"
git push origin main

echo "==> Creating and pushing immutable Git tag v${NEW_VER}..."
git tag -a "v${NEW_VER}" -m "Release v${NEW_VER}"
git push origin "v${NEW_VER}"

echo "==> Waiting 3s for GitHub archive generation..."
sleep 3

TAG_URL="https://github.com/chrisfair/wscreensavers/archive/refs/tags/v${NEW_VER}.tar.gz"
echo "==> Fetching live tarball hash directly from GitHub (${TAG_URL})..."
TARBALL_TMP=$(mktemp)
curl -sL "${TAG_URL}" -o "${TARBALL_TMP}"
SUM=$(sha256sum "${TARBALL_TMP}" | awk '{print $1}')
MD5=$(md5sum "${TARBALL_TMP}" | awk '{print $1}')
rm -f "${TARBALL_TMP}"

if [ -z "${SUM}" ] || [ ${#SUM} -ne 64 ]; then
    echo "Error: Failed to fetch valid sha256 checksum from GitHub."
    exit 1
fi
echo "==> LIVE SHA256: ${SUM}"
echo "==> LIVE MD5:    ${MD5}"

echo "==> Updating PKGBUILD, .SRCINFO, and Slackware wscreensavers.info..."
sed -i "s/^sha256sums=.*/sha256sums=('${SUM}')/" PKGBUILD
sed -i "s/^MD5SUM=.*/MD5SUM=\"${MD5}\"/" packaging/slackware/wscreensavers.info
makepkg --printsrcinfo > .SRCINFO

git add PKGBUILD .SRCINFO packaging/slackware/wscreensavers.info
git commit -m "chore(aur): update PKGBUILD and .SRCINFO with verified v${NEW_VER} sha256 checksum"
git push origin main

echo "==> Publishing to AUR..."
./scripts/push-aur.sh

echo "==> Compiling distribution binary packages for GitHub Release..."
make deb
make appimage
OUTPUT="${ROOT_DIR}" bash ./packaging/slackware/wscreensavers.SlackBuild
makepkg -f --nodeps

ARCH_PKG=$(ls wscreensavers-${NEW_VER}-*.pkg.tar.* 2>/dev/null | head -n1 || true)
DEB_PKG="wscreensavers_${NEW_VER}_amd64.deb"
APPIMAGE_PKG="wscreensavers-${NEW_VER}-x86_64.AppImage"
SLACK_PKG="wscreensavers-${NEW_VER}-x86_64-1_cf.txz"
TAR_PKG="wscreensavers-${NEW_VER}-linux-x86_64.tar.gz"

echo "==> Creating universal standalone tarball..."
tar -czvf "${TAR_PKG}" \
  wscreensavers \
  wscreensavers.desktop \
  wscreensavers.svg \
  wscreensavers.1 \
  wscreensavers.service \
  nag \
  noctalia-plugin \
  README.md \
  LICENSE

echo "==> Creating GitHub Release for v${NEW_VER} with assets..."
gh release create "v${NEW_VER}" \
  "${APPIMAGE_PKG}" \
  "${DEB_PKG}" \
  "${SLACK_PKG}" \
  "${ARCH_PKG}" \
  "${TAR_PKG}" \
  --title "WScreenSavers v${NEW_VER}" \
  --generate-notes

echo "==> Cleaning up local build artifacts..."
rm -f wscreensavers*${NEW_VER}*

echo "=========================================================="
echo "==> Release v${NEW_VER} complete!"
echo "  - GitHub Release: https://github.com/chrisfair/wscreensavers/releases/tag/v${NEW_VER}"
echo "  - AUR Package:    https://aur.archlinux.org/packages/wscreensavers"
echo "=========================================================="
