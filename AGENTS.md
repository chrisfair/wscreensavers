# Developer & Agent Guidelines for WScreenSavers

## CRITICAL RULE: AUR SHA256 Checksum Integrity

Every Arch Linux AUR package release MUST strictly adhere to this verification protocol. Cheating, guessing, or generating sha256sums before pushing tags to GitHub is strictly forbidden.

### Mandatory Release Protocol:
1. **Commit all code**: All changes, assets, documentation, and version bumps must be committed.
2. **Create and push the Git tag first**:
   ```bash
   git tag -a v${VERSION} -m "Release v${VERSION}"
   git push origin v${VERSION}
   ```
3. **Fetch the live tarball hash directly from GitHub**:
   ```bash
   TAG_URL="https://github.com/chrisfair/wscreensavers/archive/refs/tags/v${VERSION}.tar.gz"
   SUM=$(curl -sL "${TAG_URL}" | sha256sum | awk '{print $1}')
   ```
4. **Update `PKGBUILD` and regenerate `.SRCINFO`**:
   Ensure `pkgver=${VERSION}` and `sha256sums=('${SUM}')`.
   Run `makepkg --printsrcinfo > .SRCINFO`.
5. **Mandatory Local Verification**:
   Always run `makepkg -f -C --noconfirm` or `updpkgsums` to verify pacman/makepkg validates the archive checksum with zero errors.
6. **Push to AUR**:
   Use `scripts/push-aur.sh` or copy verified `PKGBUILD` and `.SRCINFO` to the AUR repository and push to `aur/master`.
7. **Tag Immutability**:
   Once a tag is pushed, NEVER force-push or re-tag it. If a change is needed, bump to the next patch version.
