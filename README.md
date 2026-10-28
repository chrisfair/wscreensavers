# WScreenSavers

<p align="center">
  <img src="assets/screenshot-chess3d.png" alt="WScreenSavers 3D Chess Openings" width="850" style="border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);" />
</p>

<p align="center">
  <a href="https://aur.archlinux.org/packages/wscreensavers"><img src="https://img.shields.io/aur/version/wscreensavers?logo=archlinux&color=blue" alt="AUR version" /></a>
  <a href="https://github.com/chrisfair/wscreensavers/releases"><img src="https://img.shields.io/github/v/release/chrisfair/wscreensavers?color=emerald" alt="GitHub Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-orange.svg" alt="License" /></a>
  <a href="https://wayland.freedesktop.org/"><img src="https://img.shields.io/badge/display-Wayland%20Layer--Shell-purple.svg" alt="Wayland" /></a>
  <a href="https://github.com/chrisfair/wscreensavers/stargazers"><img src="https://img.shields.io/github/stars/chrisfair/wscreensavers?style=social" alt="Stars" /></a>
</p>

<p align="center">
  Wayland screensaver, PAM lock screen, and live wallpaper daemon.<br />
  Runs 310+ classic <strong>XScreenSaver</strong> binaries and 25 built-in WebGL2 visualizers on Wayland compositors (Hyprland, Sway, River, Wayfire, and KDE).
</p>

---

## Overview

Classic XScreenSaver relies on X11 root-window drawing and X11 server grabs, which do not work on Wayland compositors. `wscreensavers` bridges that gap using standard Wayland protocols (`zwlr_layer_shell_v1` and `ext-idle-notify-v1`):

- **25 Built-in WebGL2 Visualizers**: Includes 3D Function Plotter (Polar & Rectangular), Apex 3D Chess (`bughouse-online.com`), 3D Chess Openings, GLMatrix, Flurry, 3D Pipes, Star Wars, Amiga Boing, and others.
- **XScreenSaver Bridge**: Streams installed `/usr/lib/xscreensaver/*` and `rss-glx` binaries onto Wayland layer-shell surfaces (`endgame`, `anemone`, `glknots`, `sierpinski3d`, etc.).
- **Live Wallpapers**: Renders any screensaver on the `zwlr_layer_shell_v1` background layer with configurable FPS caps, per-monitor assignments, and automatic pause when locked.
- **PAM Screen Lock**: Built-in PAM authentication overlay or delegation to `hyprlock` / `swaylock`.
- **Multi-Monitor Support**: Run independent random savers per output, cloned displays, or pin specific savers to specific monitors.
- **Audio & Fullscreen Inhibition**: Pauses idle timers during PipeWire/PulseAudio playback or when a fullscreen window is active.
- **Noctalia Plugin**: Includes a status bar widget, control panel, and `wscreensavers ctl` CLI interface.

---

## Screenshots

| Studio Control Center | Noctalia Control Panel |
| :---: | :---: |
| <img src="assets/screenshot-studio.png" width="420" style="border-radius: 8px;" /> | <img src="assets/screenshot-noctalia.png" width="420" style="border-radius: 8px;" /> |

---

## Quick Install

```bash
# Arch Linux / Manjaro / CachyOS (AUR)
paru -S wscreensavers
# or: yay -S wscreensavers

# Ubuntu / Debian / Snap Store
sudo snap install wscreensavers
```

Pre-built packages (`.AppImage`, `.deb`, `.snap`, `.pkg.tar.xz`, `.tar.gz`) are available on [GitHub Releases](https://github.com/chrisfair/wscreensavers/releases), on the [Snap Store](https://snapcraft.io/wscreensavers), or via Nix flakes (`nix run github:chrisfair/wscreensavers`).

---

## Documentation

| Guide | Description |
| :--- | :--- |
| [Installation Guide](docs/installation.md) | Package manager instructions, binary downloads, and building from source. |
| [Compositor & CLI Guide](docs/configuration.md) | Setup for Hyprland, Sway, River, systemd user service, and `wscreensavers ctl` commands. |
| [Native Visualizers](docs/visualizers.md) | List of built-in WebGL2 and Canvas visualizers. |
| [XScreenSaver Packages](docs/xscreensaver-packages.md) | Distro packages for installing the 310+ external XScreenSaver and `rss-glx` binaries. |
| [Noctalia Integration](docs/noctalia.md) | Setting up the Noctalia shell plugin and widget. |
| [Development](docs/development.md) | Building, testing, and packaging. |

---

## Supporting the Project

WScreenSavers is free and open-source software released under the **GNU General Public License v3.0**.

All features are unlocked for everyone. If you find the project useful and want to support ongoing development, one-time contributions can be made via Stripe (processed under the author's primary site, `bughouse-online.com`):

| Level | Link | Type | Notes |
| :--- | :---: | :---: | :--- |
| **Pawn** | [**$1**](https://buy.stripe.com/14A7sEgae18A5Mi3P2efC00) | One-time | Coffee contribution |
| **Knight** | [**$5**](https://buy.stripe.com/cNidR2e262cEeiOdpCefC01) | One-time | Community supporter |
| **Rook** | [**$10**](https://buy.stripe.com/bJe3cogae5oQdeKgBOefC02) | One-time | Supporter pass |
| **Queen** | [**$35**](https://buy.stripe.com/aFa7sE2joeZqdeK99mefC03) | One-time | Project sponsor |
| **King** | [**$350**](https://buy.stripe.com/6oUbIUf6a04w3Ea71eefC05) | One-time | Hardware & development patron |

### Disabling the Support Reminder

To disable the startup support reminder permanently without contributing:

```bash
# Via CLI:
wscreensavers ctl nag off

# Or via config file:
mkdir -p ~/.config/wscreensavers
echo '{"supported": true, "isLifetime": true}' > ~/.config/wscreensavers/support.json

# Or system-wide:
sudo rm -f /usr/share/wscreensavers/nag
```

---

## License

Licensed under the **GNU General Public License v3.0** ([`GPL-3.0-or-later`](LICENSE)).
Original XScreenSaver hacks are copyrighted by Jamie Zawinski and their respective authors.
