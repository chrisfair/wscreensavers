#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT_DIR}"

VERSION=$(grep -E '^pkgver=' PKGBUILD | head -n1 | cut -d'=' -f2 | tr -d '[:space:]')
OUTPUT_FILE="${ROOT_DIR}/wscreensavers-${VERSION}-x86_64.AppImage"

# If running on the host and Docker is available, build inside Ubuntu 22.04 LTS so
# glibc (2.35) and all bundled WebKit2GTK 4.1 / GTK-Layer-Shell libraries are
# binary-compatible with older LTS distributions and AppImageHub's test runner.
if [ "${IN_APPIMAGE_CONTAINER:-0}" != "1" ] && command -v docker >/dev/null 2>&1; then
    echo "==> Building self-contained Ubuntu 22.04 LTS AppImage via Docker..."
    docker run --rm \
        -e IN_APPIMAGE_CONTAINER=1 \
        -e HOST_UID="$(id -u)" \
        -e HOST_GID="$(id -g)" \
        -v "${ROOT_DIR}:/work" \
        -w /work \
        ubuntu:22.04 bash -c '
            set -euo pipefail
            export DEBIAN_FRONTEND=noninteractive
            apt-get update
            apt-get install -y --no-install-recommends \
                ca-certificates curl git build-essential pkg-config file desktop-file-utils \
                librsvg2-bin squashfs-tools fuse libfuse2 \
                libgtk-3-dev libwebkit2gtk-4.1-dev libgtk-layer-shell-dev \
                libpam0g-dev libwayland-dev libx11-dev
            if ! command -v go >/dev/null 2>&1; then
                curl -fsSL https://go.dev/dl/go1.24.1.linux-amd64.tar.gz | tar -C /usr/local -xz
                export PATH="/usr/local/go/bin:${PATH}"
            fi
            if ! command -v node >/dev/null 2>&1; then
                curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
                apt-get install -y --no-install-recommends nodejs
            fi
            git config --global --add safe.directory /work
            export GOFLAGS="-buildvcs=false"
            bash ./packaging/appimage/build-appimage.sh
            chown "${HOST_UID}:${HOST_GID}" "/work/wscreensavers-'"${VERSION}"'-x86_64.AppImage"
        '
    exit 0
fi

APP_DIR="/tmp/wscreensavers.AppDir"

echo "==> Staging AppDir for wscreensavers v${VERSION}..."
make build SKIP_COVERAGE=1

rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}/usr/lib/webkit2gtk-4.1"

make install DESTDIR="${APP_DIR}" PREFIX=/usr
# Remove nag file inside the portable AppImage so first-launch opens directly to the studio window
rm -f "${APP_DIR}/usr/share/wscreensavers/nag"

# Compile LD_PRELOAD hook so WebKit2GTK finds bundled WebKitNetworkProcess & WebKitWebProcess
gcc -shared -fPIC -O2 "${SCRIPT_DIR}/webkit_path_hook.c" -o "${APP_DIR}/usr/lib/libwebkit_path_hook.so" -ldl

# Bundle WebKit2GTK helper processes and injected bundle
for wkdir in /usr/lib/x86_64-linux-gnu/webkit2gtk-4.1 /usr/lib/webkit2gtk-4.1 /usr/libexec/webkit2gtk-4.1; do
    if [ -d "${wkdir}" ]; then
        cp -a "${wkdir}/." "${APP_DIR}/usr/lib/webkit2gtk-4.1/"
        break
    fi
done

# Exclude only base glibc/X11/DRM libraries that must come from the host GPU/libc stack
is_excluded_lib() {
    case "$1" in
        linux-vdso.so*|ld-linux*.so*|libc.so*|libm.so*|libdl.so*|librt.so*|libpthread.so*|libresolv.so*|libnss_*.so*|libutil.so*|libcrypt.so*)
            return 0 ;;
        libGL.so*|libGLX.so*|libGLdispatch.so*|libEGL.so*|libgbm.so*|libdrm*.so*|libvulkan.so*|libX11.so*|libxcb.so*)
            return 0 ;;
        *)
            return 1 ;;
    esac
}

bundle_deps_for() {
    local target="$1"
    [ -e "${target}" ] || return 0
    ldd "${target}" 2>/dev/null | awk '/=> \// {print $3}' | while read -r libpath; do
        [ -n "${libpath}" ] && [ -f "${libpath}" ] || continue
        local base
        base="$(basename "${libpath}")"
        if is_excluded_lib "${base}"; then
            continue
        fi
        if [ ! -f "${APP_DIR}/usr/lib/${base}" ]; then
            cp -L "${libpath}" "${APP_DIR}/usr/lib/${base}"
        fi
    done
}

echo "==> Bundling shared libraries (WebKit2GTK 4.1, gtk-layer-shell, Soup3, ICU)..."
bundle_deps_for "${APP_DIR}/usr/bin/wscreensavers"
for helper in "${APP_DIR}/usr/lib/webkit2gtk-4.1/"* "${APP_DIR}/usr/lib/webkit2gtk-4.1/injected-bundle/"*; do
    if [ -f "${helper}" ]; then
        bundle_deps_for "${helper}"
    fi
done

cp "${SCRIPT_DIR}/AppRun" "${APP_DIR}/AppRun"
chmod +x "${APP_DIR}/AppRun"

cp "${APP_DIR}/usr/share/applications/wscreensavers.desktop" "${APP_DIR}/"
cp "${APP_DIR}/usr/share/icons/hicolor/scalable/apps/wscreensavers.svg" "${APP_DIR}/wscreensavers.svg"

if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w 256 -h 256 "${APP_DIR}/wscreensavers.svg" -o "${APP_DIR}/wscreensavers.png"
    ln -sf wscreensavers.png "${APP_DIR}/.DirIcon"
fi

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
echo "==> Successfully generated: ${OUTPUT_FILE}"
