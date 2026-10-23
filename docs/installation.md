# 📦 Installation Guide

WScreenSavers supports multiple installation methods across all major Linux distributions.

---

## 1. Arch Linux / Manjaro / CachyOS (AUR)

Install via your preferred AUR helper:

```bash
paru -S wscreensavers
# or
yay -S wscreensavers
```

---

## 2. Pre-Built Binary Packages (GitHub Releases)

Pre-compiled binary packages and standalone bundles are published with every release on the [**GitHub Releases**](https://github.com/chrisfair/wscreensavers/releases) page:

| Format | File Pattern | Installation Command |
| :--- | :--- | :--- |
| **Universal AppImage** | `wscreensavers-*-x86_64.AppImage` | `chmod +x wscreensavers-*.AppImage && ./wscreensavers-*.AppImage` |
| **Debian / Ubuntu / Mint / Pop!_OS** | `wscreensavers_*_amd64.deb` | `sudo dpkg -i wscreensavers_*_amd64.deb` |
| **Arch Linux / Pacman** | `wscreensavers-*-x86_64.pkg.tar.xz` | `sudo pacman -U wscreensavers-*-x86_64.pkg.tar.xz` |
| **Portable Linux Tarball** | `wscreensavers-*-linux-x86_64.tar.gz` | `tar -xzf wscreensavers-*-linux-x86_64.tar.gz` |

---

## 3. NixOS / Nix Flakes

Run directly via Nix flakes:

```bash
nix run github:chrisfair/wscreensavers
```

Or add to your NixOS flake inputs:

```nix
inputs.wscreensavers.url = "github:chrisfair/wscreensavers";
```

---

## 4. Building from Source

### Prerequisites
* Go 1.22+
* Node.js 18+ and npm
* Development headers: `gtk3`, `webkit2gtk-4.1`, `gtk-layer-shell`, `pam`
* Runtime packages: `xscreensaver`, `xorg-server-xvfb`, `ffmpeg`

### Build & Install

```bash
# Clone the repository
git clone https://github.com/chrisfair/wscreensavers.git
cd wscreensavers

# Build frontend and Go binaries
make build

# Install binaries, assets, and desktop entry to system (/usr/local or /usr)
sudo make install
```

---

## 5. Next Steps

* [Compositor & CLI Setup Guide](configuration.md)
* [Unlocking 330+ XScreenSaver Visualizers](xscreensaver-packages.md)
* [Noctalia Shell Integration](noctalia.md)
