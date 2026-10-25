#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

VERSION=$(grep -E '^pkgver=' PKGBUILD | head -n1 | cut -d'=' -f2 | tr -d '[:space:]')
RPM_TOPDIR="/tmp/rpmbuild-wscreensavers"

echo "==> Preparing RPM build environment for wscreensavers v${VERSION}..."

if ! command -v rpmbuild >/dev/null 2>&1; then
    echo "NOTICE: 'rpmbuild' is not installed on this host."
    echo "The RPM spec file is ready at: ${SCRIPT_DIR}/wscreensavers.spec"
    echo "To build on Fedora/RHEL/openSUSE: rpmbuild -ba packaging/rpm/wscreensavers.spec"
    exit 0
fi

rm -rf "${RPM_TOPDIR}"
mkdir -p "${RPM_TOPDIR}"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Create source tarball
tar --exclude-vcs --transform="s,^\.,wscreensavers-${VERSION}," -czf "${RPM_TOPDIR}/SOURCES/v${VERSION}.tar.gz" .

cp "${SCRIPT_DIR}/wscreensavers.spec" "${RPM_TOPDIR}/SPECS/"

rpmbuild --define "_topdir ${RPM_TOPDIR}" -ba "${RPM_TOPDIR}/SPECS/wscreensavers.spec"
cp "${RPM_TOPDIR}"/RPMS/*/*.rpm "${ROOT_DIR}/" || true
echo "==> RPM build complete."
