# Development & Contributing Guide

WScreenSavers is built with **Go** (for system daemons, Wayland protocols, PAM auth, and IPC) and **Vue 3 / Vite / Three.js** (for visualizers and the Control Center Studio GUI).

---

## 1. Prerequisites

### Arch Linux / Derivatives
```bash
sudo pacman -S --needed go nodejs npm gtk3 webkit2gtk-4.1 gtk-layer-shell pam xscreensaver xorg-server-xvfb ffmpeg
```

### Debian / Ubuntu
```bash
sudo apt install golang-go nodejs npm libgtk-3-dev libwebkit2gtk-4.1-dev libgtk-layer-shell-dev libpam0g-dev xscreensaver xvfb ffmpeg
```

### Fedora / RHEL
```bash
sudo dnf install golang nodejs npm gtk3-devel webkit2gtk4.1-devel gtk-layer-shell-devel pam-devel xscreensaver xorg-x11-server-Xvfb ffmpeg
```

---

## 2. Building

```bash
# Clone the repository
git clone https://github.com/chrisfair/wscreensavers.git
cd wscreensavers

# Build frontend and binary
make build

# Launch the built binary directly
./wscreensavers
```

---

## 3. Running Unit Tests

Run the complete Go test suite with coverage:

```bash
make test
```

Or test specific packages:

```bash
go test -v ./internal/ctl/...
go test -v ./internal/support/...
go test -v ./internal/config/...
```

---

## 4. Release Packaging

* Releases verify live GitHub tarball SHA256 checksums before updating AUR `PKGBUILD` and `.SRCINFO`.
* Build release artifacts:
  ```bash
  make release VERSION=X.Y.Z
  ```
