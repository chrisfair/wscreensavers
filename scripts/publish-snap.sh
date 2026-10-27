#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

SNAP_FILE=$(ls -1 wscreensavers_*.snap 2>/dev/null | head -n 1 || true)

cleanup() {
    rm -f "${ROOT_DIR}/snapcraft.login"
}
trap cleanup EXIT

echo "==> Step 1: Exporting Snap Store login token..."
docker run --rm -it -v "${ROOT_DIR}:/work" -w /work snapcore/snapcraft:stable bash -c "
    snapcraft export-login --snaps=wscreensavers --acls package_access,package_push,package_update,package_release /work/snapcraft.login &&
    chown $(id -u):$(id -g) /work/snapcraft.login &&
    chmod 600 /work/snapcraft.login
"

if [ -s "${ROOT_DIR}/snapcraft.login" ]; then
    echo "==> Step 2: Saving SNAPCRAFT_STORE_CREDENTIALS to GitHub Actions secrets..."
    gh secret set SNAPCRAFT_STORE_CREDENTIALS --repo chrisfair/wscreensavers < "${ROOT_DIR}/snapcraft.login"
    gh secret list --repo chrisfair/wscreensavers
fi

if [ -n "${SNAP_FILE}" ]; then
    echo "==> Step 3: Uploading and releasing ${SNAP_FILE} to stable..."
    docker run --rm -it -v "${ROOT_DIR}:/work" -w /work \
        -e SNAPCRAFT_STORE_CREDENTIALS="$(cat "${ROOT_DIR}/snapcraft.login")" \
        snapcore/snapcraft:stable snapcraft upload --release=stable "/work/${SNAP_FILE}"
fi

echo "==> Done! https://snapcraft.io/wscreensavers"
