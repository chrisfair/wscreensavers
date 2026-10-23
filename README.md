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
  <strong>The definitive native Wayland screensaver, PAM lock screen, and live desktop wallpaper suite.</strong><br />
  Brings Jamie Zawinski's legendary 330+ <strong>XScreenSaver</strong> hacks and modern hardware-accelerated 3D WebGL visualizers to Wayland compositors (Hyprland, Sway, River, Wayfire, and KDE).
</p>

---

## 🌟 Overview

For years, Wayland compositors lacked a native, lightweight screensaver solution because classic XScreenSaver relied on X11 root-window hacks that do not work on Wayland.

**WScreenSavers** solves this cleanly using standard Wayland protocols (`zwlr_layer_shell_v1` and `ext-idle-notify-v1`):

* **Dual-Engine Architecture**:
  * **23 Native WebGL2 Visualizers**: Hand-crafted 3D Chess, GLMatrix, Flurry, 3D Pipes, Star Wars, Amiga Boing, and more.
  * **Universal XScreenSaver Bridge**: Zero-overhead Wayland stream bridge for all **310+** original `/usr/lib/xscreensaver/*` binaries (`endgame`, `anemone`, `glknots`, `sierpinski3d`, etc.).
* **Wayland Live Desktop Wallpapers**: Turn any visualizer into a 60 FPS animated desktop background with per-monitor unique assignments and auto-pause on lock.
* **Glassmorphic PAM Screen Lock**: Native PAM password authentication overlay or seamless handoff to `hyprlock` / `swaylock`.
* **Multi-Monitor Superpowers**: Run independent random visualizers per monitor, synchronized clones, or pin specific visualizers to specific screens.
* **Smart Media & Game Inhibition**: Automatically inhibits blanking during audio/video playback (PipeWire/PulseAudio) or fullscreen games.
* **Noctalia Desktop Shell Integration**: Official floating control deck, status bar widget, and IPC controls.

---

## 📸 Screenshots

| Studio Control Center | Noctalia Floating Deck |
| :---: | :---: |
| <img src="assets/screenshot-studio.png" width="420" style="border-radius: 8px;" /> | <img src="assets/screenshot-noctalia.png" width="420" style="border-radius: 8px;" /> |

---

## ⚡ Quick Install

```bash
# Arch Linux / Manjaro / CachyOS (AUR)
paru -S wscreensavers
# or: yay -S wscreensavers
```

Pre-built binaries are also available on [**GitHub Releases**](https://github.com/chrisfair/wscreensavers/releases) (`.AppImage`, `.deb`, `.pkg.tar.xz`, `.tar.gz`) and via Nix flakes (`nix run github:chrisfair/wscreensavers`).

---

## 📚 Documentation & Guides

Everything you need to configure and customize WScreenSavers is detailed in dedicated guides:

| Guide | Description |
| :--- | :--- |
| 📦 [**Installation Guide**](docs/installation.md) | Package manager instructions, pre-built binary downloads, and source compilation. |
| 🚀 [**Compositor & CLI Guide**](docs/configuration.md) | Setup for Hyprland, Sway, River, systemd service, and complete `wscreensavers ctl` command reference. |
| 🎨 [**23 Native Visualizers**](docs/visualizers.md) | Full catalog of built-in WebGL2 & Canvas visualizers with descriptions. |
| 🌐 [**Unlocking 330+ XScreenSavers**](docs/xscreensaver-packages.md) | How to install distro packages to unlock all 310+ classic visualizers (with guides for Arch, Debian/Ubuntu, Fedora, openSUSE, Slackware, NixOS, Alpine, and Gentoo). |
| 🧩 [**Noctalia Integration**](docs/noctalia.md) | Installing and configuring the official Noctalia desktop shell plugin, status bar widget, and floating control deck. |
| 🛠️ [**Development & Contributing**](docs/development.md) | Source build instructions, unit test execution, and release protocols. |

---

## 💖 Supporting the Project

WScreenSavers is 100% free and open source software released under the **GNU General Public License v3.0**.

> [!IMPORTANT]
> **Key Principles for Contributions:**
> 1. **100% Non-Obligatory**: Supporting is strictly voluntary appreciation for the author's work.
> 2. **Zero Locked Features**: Every single visualizer, PAM lock, multi-monitor configuration, live wallpaper, and CLI feature is completely unlocked and available to all users forever.
> 3. **Single One-Time Charges ONLY (No Subscriptions)**: All Stripe payment links are **one-time charges**. You will **never** be enrolled in a recurring subscription or recurring billing. The labels below (e.g., monthly coffee, annual pass) are merely suggested contribution frequencies.
> 4. **Merchant Name Notice**: Stripe checkout will display as **Bughouse Online (`bughouse-online.com`)**. This is the author's primary website and registered unified business Stripe merchant account for all independent open-source projects. All contributions directly support WScreenSavers development and test hardware.

If you enjoy using WScreenSavers on your Wayland desktop and would like to support ongoing maintenance, new visualizers, and multi-monitor compositor testing, contributions are warmly welcomed and deeply appreciated!

| Level | Link | Charge Type | Suggested Frequency / Notes |
| :--- | :---: | :---: | :--- |
| **Pawn** | [**$1**](https://buy.stripe.com/14A7sEgae18A5Mi3P2efC00) | *Single One-Time* | Suggested as a monthly coffee supporter |
| **Knight** (Recommended) | [**$5**](https://buy.stripe.com/cNidR2e262cEeiOdpCefC01) | *Single One-Time* | Suggested as an annual community supporter |
| **Rook** | [**$10**](https://buy.stripe.com/bJe3cogae5oQdeKgBOefC02) | *Single One-Time* | Lifetime appreciation pass |
| **Queen** | [**$35**](https://buy.stripe.com/aFa7sE2joeZqdeK99mefC03) | *Single One-Time* | Generous sponsor & feature booster |
| **King** | [**$350**](https://buy.stripe.com/6oUbIUf6a04w3Ea71eefC05) | *Single One-Time* | Major patron of Wayland open-source tooling |

*All contributions directly fund development hardware, compositor test matrices, and open source maintenance.*

### 🕊️ Disabling the Support Reminder Manually

We believe in complete respect for user autonomy. All features are always 100% unlocked and available to everyone. If you prefer to permanently disable or silence the voluntary support reminder without contributing, you can do so in any of the following ways:

- **Via CLI (Instant)**:
  ```bash
  wscreensavers ctl nag off
  ```
- **Via User Configuration (No root required, survives package upgrades)**:
  ```bash
  mkdir -p ~/.config/wscreensavers
  echo '{"supported": true, "isLifetime": true}' > ~/.config/wscreensavers/support.json
  ```
- **Via Package Nag File (System-wide)**:
  ```bash
  sudo rm -f /usr/share/wscreensavers/nag
  ```
- **Via GUI**:
  In the reminder dialog, simply click **"I've Supported"** (an honor system—no receipt or verification required) or click **"Maybe Later"** to dismiss for 24 hours.

---

## 📜 License

WScreenSavers is open source licensed under the **GNU General Public License v3.0** ([`GPL-3.0-or-later`](LICENSE)).
All original XScreenSaver hacks are copyrighted by Jamie Zawinski and their respective authors.
