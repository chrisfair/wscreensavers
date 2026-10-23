---
name: wscreensavers-release
description: >-
  Standard operating procedure and release runbook for WScreenSavers. Use when
  releasing a new version, bumping versions across distro packaging formats,
  verifying AUR checksums, generating binary release assets (.deb, .AppImage,
  .pkg.tar.xz, tarball), publishing to AUR, or creating GitHub releases.
---

# WScreenSavers Release Runbook & Skill

This skill defines the mandatory, step-by-step protocol for releasing a new version of **WScreenSavers**, building cross-distribution packages, publishing to the Arch User Repository (AUR), and publishing GitHub Releases with attached binary assets.

---

## 1. Critical Rules & Constraints

1. **Maintainer Identity**:
   - All commits, manifests, spec files, and tags **MUST** use:
     ```text
     Christopher Patrick Fair <christopherpatrickfair@gmail.com>
     ```
   - **NEVER** use work/corporate emails or third-party AI tool names anywhere in commits, release notes, or packages.
2. **AUR SHA256 Checksum Integrity Protocol**:
   - GitHub generates source tarballs dynamically from the git tree of the tagged commit.
   - You **MUST NEVER** calculate, guess, or hardcode the sha256sum before pushing the git tag to GitHub.
   - Pushing any commit to `main` after tagging will alter the release tree if re-tagged. **Tags are strictly immutable.**
   - If an error is discovered after pushing a tag, bump to the next patch version immediately.

---

## 2. Version Bump Checklist (8 Files)

When bumping to version `${VERSION}` (e.g., `1.0.28`):

| File | Target Line / Key | Example |
| :--- | :--- | :--- |
| [`PKGBUILD`](../../PKGBUILD) | `pkgver=` | `pkgver=1.0.28` |
| [`flake.nix`](../../flake.nix) | `version =` | `version = "1.0.28";` |
| [`packaging/debian/control`](../../packaging/debian/control) | `Version:` | `Version: 1.0.28` |
| [`packaging/rpm/wscreensavers.spec`](../../packaging/rpm/wscreensavers.spec) | `Version:` & `%changelog` | `Version: 1.0.28` |
| [`packaging/slackware/wscreensavers.info`](../../packaging/slackware/wscreensavers.info) | `VERSION=` & `DOWNLOAD=` | `VERSION="1.0.28"` |
| [`packaging/slackware/wscreensavers.SlackBuild`](../../packaging/slackware/wscreensavers.SlackBuild) | `VERSION=${VERSION:-...}` | `VERSION=${VERSION:-1.0.28}` |
| [`packaging/flatpak/com.github.chrisfair.wscreensavers.yml`](../../packaging/flatpak/com.github.chrisfair.wscreensavers.yml) | `tag:` | `tag: v1.0.28` |
| [`packaging/snap/snapcraft.yaml`](../../packaging/snap/snapcraft.yaml) | `version:` | `version: '1.0.28'` |

---

## 3. Step-by-Step Release Protocol

### Step 1: Pre-Release Quality Checks
Run tests and build verification locally:
```bash
make test
npm --prefix frontend run build
go build -tags "desktop,production,webkit2_41" -ldflags="-s -w" -o wscreensavers .
```

### Step 2: Bump Versions & Commit to `main`
Edit all 8 files listed above, stage, and push:
```bash
git add PKGBUILD flake.nix packaging/
git commit -m "chore(release): bump version to ${VERSION}"
git push origin main
```

### Step 3: Create and Push Git Tag
Tag the commit that was just pushed to `main`:
```bash
git tag -a v${VERSION} -m "Release v${VERSION}"
git push origin v${VERSION}
```

### Step 4: Fetch Live Tarball Hash from GitHub
Fetch the live tarball hash directly from GitHub:
```bash
TAG_URL="https://github.com/chrisfair/wscreensavers/archive/refs/tags/v${VERSION}.tar.gz"
SUM=$(curl -sL "${TAG_URL}" | sha256sum | awk '{print $1}')
echo "LIVE SHA256: ${SUM}"
```

### Step 5: Update `PKGBUILD` and Regenerate `.SRCINFO`
1. Update `sha256sums=('${SUM}')` in `PKGBUILD`.
2. Regenerate `.SRCINFO`:
   ```bash
   makepkg --printsrcinfo > .SRCINFO
   ```
3. Commit and push:
   ```bash
   git add PKGBUILD .SRCINFO
   git commit -m "chore(aur): update PKGBUILD and .SRCINFO with verified v${VERSION} sha256 checksum"
   git push origin main
   ```

### Step 6: Publish to AUR
Run the automated verification and push script:
```bash
./scripts/push-aur.sh
```
*Note: This script verifies the live checksum with `makepkg -f -C --noconfirm`, runs the unit test suite, and pushes to `aur@aur.archlinux.org/wscreensavers.git`.*

### Step 7: Build Binary Distribution Packages
Generate all standalone assets to attach to the GitHub Release:
```bash
# 1. Debian (.deb)
make deb

# 2. Universal AppImage (.AppImage)
make appimage

# 3. Arch Linux (.pkg.tar.xz)
makepkg -f --nodeps

# 4. Portable Linux Tarball (.tar.gz)
tar -czvf "wscreensavers-${VERSION}-linux-x86_64.tar.gz" \
  wscreensavers \
  wscreensavers.desktop \
  wscreensavers.svg \
  wscreensavers.service \
  nag \
  noctalia-plugin \
  README.md \
  LICENSE
```

### Step 8: Publish GitHub Release with Assets
Publish the release using `gh`:
```bash
gh release create "v${VERSION}" \
  "wscreensavers-${VERSION}-x86_64.AppImage" \
  "wscreensavers_${VERSION}_amd64.deb" \
  "wscreensavers-${VERSION}-1-x86_64.pkg.tar.xz" \
  "wscreensavers-${VERSION}-linux-x86_64.tar.gz" \
  --title "WScreenSavers v${VERSION}" \
  --notes "<Release notes markdown>"
```

### Step 9: Workspace Cleanup
Remove local packaging binaries from the repository directory:
```bash
rm -f wscreensavers*${VERSION}*
git status
```
Confirm the working tree is clean.
