#!/usr/bin/env bash
set -euo pipefail

AUR_REPO="ssh://aur@aur.archlinux.org/wscreensavers.git"
CLONE_DIR="/tmp/aur-wscreensavers"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

VERSION=$(grep -E '^pkgver=' PKGBUILD | head -n1 | cut -d'=' -f2 | tr -d '[:space:]')

echo "==> Pushing WScreenSavers v${VERSION} to AUR (${AUR_REPO})..."

# Verify that git working tree is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Git working directory is not clean. Commit or stash changes first." >&2
    exit 1
fi

# Ensure tag exists locally and remotely
if ! git rev-parse "v${VERSION}" >/dev/null 2>&1; then
    echo "ERROR: Tag v${VERSION} does not exist locally." >&2
    exit 1
fi

# Ensure sha256sums and .SRCINFO accurately match the published tag tarball
echo "==> Verifying source checksum for v${VERSION} from GitHub..."
TAG_URL="https://github.com/chrisfair/wscreensavers/archive/refs/tags/v${VERSION}.tar.gz"
SUM=$(curl -sL "${TAG_URL}" | sha256sum | awk '{print $1}')

if [ -z "${SUM}" ] || [ "${#SUM}" -ne 64 ]; then
    echo "ERROR: Failed to download or calculate sha256 for ${TAG_URL}" >&2
    exit 1
fi

echo "==> Live tarball SHA256: ${SUM}"
sed -i -E "s/sha256sums=\('[a-f0-9]+'\)/sha256sums=('${SUM}')/" PKGBUILD

if command -v makepkg >/dev/null 2>&1; then
    echo "==> Updating .SRCINFO..."
    makepkg --printsrcinfo > .SRCINFO
fi

# Commit updated PKGBUILD/.SRCINFO if modified
if [ -n "$(git status --porcelain PKGBUILD .SRCINFO)" ]; then
    git commit -m "chore(aur): update sha256sum and .SRCINFO for v${VERSION}" PKGBUILD .SRCINFO
    git push origin main
fi

# Clone or update AUR worktree
if [ ! -d "${CLONE_DIR}/.git" ]; then
    rm -rf "${CLONE_DIR}"
    git clone "${AUR_REPO}" "${CLONE_DIR}"
else
    git -C "${CLONE_DIR}" fetch origin
    git -C "${CLONE_DIR}" reset --hard origin/master
fi

cp PKGBUILD "${CLONE_DIR}/PKGBUILD"
cp .SRCINFO "${CLONE_DIR}/.SRCINFO"

# Verify with makepkg in AUR clone directory
echo "==> Verifying package integrity with makepkg..."
(cd "${CLONE_DIR}" && makepkg -f -C --noconfirm)

if [ -n "$(git -C "${CLONE_DIR}" status --porcelain)" ]; then
    git -C "${CLONE_DIR}" commit -am "Update to v${VERSION}"
    git -C "${CLONE_DIR}" push origin master
    echo "==> Successfully updated AUR package to v${VERSION}"
else
    echo "==> AUR package is already up to date with v${VERSION}"
fi
