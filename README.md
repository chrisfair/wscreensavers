# WScreenSavers

<p align="center">
  <img src="assets/screenshot-chess3d.png" alt="WScreenSavers 3D Chess Openings" width="800" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
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

## ⚡ Quick Install

### Arch Linux / Manjaro (AUR)
```bash
paru -S wscreensavers
# or
yay -S wscreensavers
```

### Direct Package Downloads (Pre-built Binaries)
Pre-built packages are available on the [**GitHub Releases**](https://github.com/chrisfair/wscreensavers/releases) page:
* **Universal AppImage**: `wscreensavers-*-x86_64.AppImage` (runs on any Linux distro)
* **Debian / Ubuntu / Mint / Pop!_OS**: `wscreensavers_*_amd64.deb` (`sudo dpkg -i ...`)
* **Arch Linux / CachyOS**: `wscreensavers-*-x86_64.pkg.tar.xz` (`sudo pacman -U ...`)
* **Portable Linux Tarball**: `wscreensavers-*-linux-x86_64.tar.gz`

### NixOS / Nix Flakes
```bash
nix run github:chrisfair/wscreensavers
```

### Build from Source
```bash
git clone https://github.com/chrisfair/wscreensavers.git
cd wscreensavers
make build
sudo make install
```

---

## 🧩 Noctalia Desktop Shell Integration

WScreenSavers includes an official native plugin for the **Noctalia** Wayland desktop shell (`christopherpfair/wscreensavers`), featuring a status bar widget, per-monitor live wallpaper controls, and a floating control deck.

### Adding the Noctalia Plugin Repository
```bash
# 1. Add the official Noctalia plugin repository
noctalia msg plugins source add chrisfair git https://gitlab.com/chrisfair/noctalia-plugins

# 2. Update and enable the plugin
noctalia msg plugins update chrisfair
noctalia msg plugins enable christopherpfair/wscreensavers
```
*(If installed via AUR or `.deb`, you can alternatively register the local source: `noctalia msg plugins source add wscreensavers path /usr/share/wscreensavers/noctalia-plugins`)*

👉 **For full widget configuration, IPC triggers, and keybinding examples, see the [Noctalia Integration Guide](docs/noctalia.md).**

---

## 🌐 Unlocking All 330+ Classic XScreenSaver Visualizers

WScreenSavers includes **23 built-in WebGL2 visualizers** out of the box. Installing your distribution's standard XScreenSaver packages unlocks **310+ additional classic and 3D OpenGL visualizers** (`endgame`, `anemone`, `glknots`, `superquadrics`, `circuit`, etc.) through WScreenSavers' zero-overhead Wayland bridge.

### Generic Distro Setup Commands:
* **Arch / Manjaro / CachyOS**: `sudo pacman -S xscreensaver rss-glx`
* **Debian / Ubuntu / Mint**: `sudo apt install xscreensaver xscreensaver-gl xscreensaver-gl-extra rss-glx`
* **Fedora / RHEL**: `sudo dnf install xscreensaver-extras xscreensaver-gl-extras rss-glx`
* **openSUSE**: `sudo zypper in xscreensaver xscreensaver-gl xscreensaver-gl-extra`
* **Slackware**: `sboinstall xscreensaver rss-glx`
* **NixOS**: `environment.systemPackages = [ pkgs.xscreensaver ];`

### Detailed Per-Distribution Guides:
For step-by-step package breakdowns and verification instructions:
* [Overview & Architecture](docs/xscreensaver-packages.md)
* [Arch Linux & Derivatives](docs/distros/arch.md)
* [Debian, Ubuntu, & Linux Mint](docs/distros/debian-ubuntu.md)
* [Fedora & Enterprise Linux](docs/distros/fedora-rhel.md)
* [openSUSE (Tumbleweed & Leap)](docs/distros/opensuse.md)
* [Slackware Linux & SBo](docs/distros/slackware.md)
* [NixOS & Flakes](docs/distros/nixos.md)
* [Alpine Linux](docs/distros/alpine.md)
* [Gentoo Linux](docs/distros/gentoo.md)

Once installed, simply run:
```bash
# Add all 330+ hacks to your active rotation pool
wscreensavers ctl pool all
```

---

## 🌟 Why WScreenSavers?

For years, Wayland compositors lacked a native, lightweight screensaver solution. Classic XScreenSaver relied on X11 root-window hacks that do not work on Wayland.

**WScreenSavers** solves this cleanly using standard Wayland protocols (`zwlr_layer_shell_v1` and `ext-idle-notify-v1`):

- **Dual-Engine Flexibility**:
  - **Engine A (Native WebGL2/Canvas)**: 23 hand-crafted, hardware-accelerated visualizers with real-time UI parameter controls.
  - **Engine B (Universal XScreenSaver Bridge)**: Zero-overhead live stream bridge for all **310+** original `/usr/lib/xscreensaver/*` binaries (`endgame`, `anemone`, `glknots`, `sierpinski3d`, etc.) with full XML parameter parsing.
- **Wayland Live Desktop Wallpapers**: Turn any screensaver into an interactive, 60 FPS live animated background (`GTK_LAYER_SHELL_LAYER_BACKGROUND`) with configurable FPS caps.
- **Glassmorphic PAM Screen Lock**: Native Linux PAM password authentication or seamless plug-and-play handoff to `hyprlock` / `swaylock`.
- **Multi-Monitor Superpowers**:
  - **Independent Random**: Different screensaver on every monitor.
  - **Synchronized Clone**: Same hack running across all screens.
  - **Per-Monitor Pinning**: Set 3D Chess on your main monitor, GLMatrix on your vertical display, and Flurry on your secondary screen.
- **Smart Idle & Media Inhibition**: Automatically inhibits screen blanking when watching YouTube, Twitch, MPV, or VLC (via PipeWire/PulseAudio) or playing fullscreen games.
- **Noctalia Integration**: Includes an official Noctalia floating control deck and status bar widget.

---

## 📸 Screenshots & Showcase

| True 3D Chess Openings (endgame style) | Studio Control Center |
| :---: | :---: |
| <img src="assets/screenshot-chess3d.png" width="400" /> | <img src="assets/screenshot-studio.png" width="400" /> |

<p align="center">
  <strong>Noctalia Shell Control Deck</strong><br />
  <img src="assets/screenshot-noctalia.png" width="500" style="border-radius: 8px;" />
</p>

---

## 🎨 23 Native Hardware-Accelerated Visualizers

WScreenSavers includes 23 built-in WebGL2/Canvas visualizers with zero external dependencies:

1. **Chess Openings (3D)**: True 3D rendered grandmaster chess openings (Najdorf, Berlin, Queen's Gambit, King's Indian, etc.) with 3D Staunton pieces, specular board, parabolic lift arcs, and smooth camera orbit matching XScreenSaver's classic `endgame`.
2. **GLMatrix**: 3D Matrix katakana glyph digital rain with depth fog, volumetric glow, and camera drift.
3. **Flurry**: Multi-stream particle smoke plumes swirling around oscillating gravitational attractors.
4. **3D Pipes**: Self-building metallic plumbing networks with ball joints, 90° elbows, and Utah teapot Easter eggs.
5. **Amiga Boing**: 1984 Amiga 1000 red-and-white checkered bouncing sphere with purple room grid.
6. **Flying Toasters**: Winged chrome toasters and crispy toast slices soaring through the midnight sky.
7. **Star Wars Crawl**: Receding perspective opening text streaming live system logs or Unix lore.
8. **Geodesic Gears**: Interlocking 3D planetary gear assemblies with metallic specular highlights.
9. **Hyperspace**: Relativistic starfield warp drive tunnel with colorful nebula clouds.
10. **3D Maze**: First-person raycasted labyrinth with HUD minimap and brick wall textures.
11. **Sonar**: Tactical radar sweep plotting real LAN ARP network peers and active Linux processes.
12. **XAnalogTV**: Vintage CRT tube simulation with RF static, sync roll, and SMPTE color bars.
13. **BSOD**: Multi-OS crash screens (Windows NT, Linux Kernel Panic, Amiga Guru, Mac Sad Mac, TempleOS).
14. **Molecule**: 3D ball-and-stick molecular models (Caffeine, DNA, Buckminsterfullerene C60, Benzene).
15. **Phosphor**: Vintage P1 green or P3 amber teletype terminal typing live Linux telemetry.
16. **Strange Attractors**: Lorenz, Rössler, Aizawa, and Thomas chaotic dynamical systems.
17. **Mandelbrot & Julia**: Smooth continuous fractal zoom explorer with cycling palettes.
18. **Galaxy**: Colliding N-body spiral galactic arms with glowing dust cores.
19. **Game of Life**: Conway's cellular automaton with rainbow aging and glider genesis.
20. **Pyro**: Multi-stage aerial firework detonations with gravity particle physics.
21. **Epicycle**: Fourier harmonic epicycles drawing complex orbital curves.
22. **Rorschach**: Procedural inkblot symmetry patterns.
23. **Mystify**: Classic Windows 3.1 glowing bouncing polygons with color cycling trails.

---

## 🚀 Quickstart & Compositor Setup

### Hyprland (`~/.config/hypr/hyprland.conf`)

```ini
# Start the WScreenSavers idle daemon on login
exec-once = wscreensavers --daemon

# Keybinding to lock screen
bind = $mainMod, L, exec, wscreensavers --lock

# Keybinding to launch immediate screensaver preview
bind = $mainMod SHIFT, S, exec, wscreensavers --saver

# Keybinding to toggle live desktop wallpaper
bind = $mainMod ALT, W, exec, wscreensavers ctl wallpaper toggle
```

### Sway (`~/.config/sway/config`)

```ini
exec wscreensavers --daemon
bindsym $mod+l exec wscreensavers --lock
```

### CLI Controls (`wscreensavers ctl`)

WScreenSavers includes a CLI control tool for scripting and keybindings:

```bash
# Launch screensaver overlay
wscreensavers ctl launch

# Launch specific screensaver
wscreensavers ctl launch chessopenings

# Lock screen immediately
wscreensavers ctl lock

# Pick a random screensaver from the enabled pool and launch
wscreensavers ctl randomize launch

# Toggle live desktop wallpaper mode
wscreensavers ctl wallpaper toggle

# Enable all 330+ installed screensavers in rotation pool
wscreensavers ctl pool all

# Open the graphical Control Center Studio
wscreensavers ctl gui

# Permanently silence the startup support reminder
wscreensavers ctl nag off
```

---

## 🛠️ Building & Contributing

WScreenSavers is written in **Go** and **Vue 3 / Three.js**:

```bash
# Install build dependencies (Arch Linux)
sudo pacman -S --needed go nodejs npm gtk3 webkit2gtk-4.1 gtk-layer-shell pam xscreensaver xorg-server-xvfb ffmpeg

# Clone & Build
git clone https://github.com/chrisfair/wscreensavers.git
cd wscreensavers
make build

# Run Unit Tests with Coverage
make test
```

---

## 💖 Supporting the Project

WScreenSavers is 100% free and open source software released under the **GNU General Public License v3.0**. There are no paywalls, telemetry, or locked features.

If you enjoy using WScreenSavers on your Wayland desktop and would like to support ongoing maintenance, new visualizers, and multi-monitor compositor testing, contributions are warmly welcomed and deeply appreciated!

| Level | Link | Notes |
| :--- | :---: | :--- |
| **Pawn** | [**$1 / month**](https://buy.stripe.com/14A7sEgae18A5Mi3P2efC00) | Monthly coffee supporter |
| **Knight** (Recommended) | [**$5 / year**](https://buy.stripe.com/cNidR2e262cEeiOdpCefC01) | Annual community supporter |
| **Rook** | [**$10 one-time**](https://buy.stripe.com/bJe3cogae5oQdeKgBOefC02) | Lifetime appreciation pass |
| **Queen** | [**$35 one-time**](https://buy.stripe.com/aFa7sE2joeZqdeK99mefC03) | Generous sponsor & feature booster |
| **King** | [**$350 one-time**](https://buy.stripe.com/6oUbIUf6a04w3Ea71eefC05) | Major patron of Wayland open-source tooling |

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
