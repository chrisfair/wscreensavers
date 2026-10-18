# WScreenSavers

**WScreenSavers** is a native Wayland screensaver, PAM lock screen, and live desktop wallpaper suite inspired by Jamie Zawinski's iconic **XScreenSaver** collection.

It combines a **Dual-Engine Architecture**:
1. **Engine A — 22 Built-In Native Wayland Visualizers**: Hardware-accelerated WebGL2/Canvas ports of classic XScreenSaver modules with real-time parameter controls (`GLMatrix`, `Flurry`, `3D Pipes`, `Amiga Boing`, `Flying Toasters`, `Star Wars Crawl`, `Geodesic Gears`, `Strange Attractors`, `Hyperspace`, `3D Maze`, `Sonar`, `XAnalogTV`, `BSOD`, `Epicycle`, `Mandelbrot`, `Galaxy`, `Game of Life`, `Pyro`, `Rorschach`, `Mystify`, `Molecule`, `Phosphor`).
2. **Engine B — Universal XScreenSaver XML & Binary Bridge**: Automatically scans `/usr/share/xscreensaver/config/*.xml` and `/usr/lib/xscreensaver/*`, parses XML parameter schemas into native UI sliders/toggles/dropdowns, and launches external XScreenSaver binaries on Wayland.

---

## Core Features

- **Control Center GUI**: Browse all screensavers by category, tweak per-hack parameters in real time, test in fullscreen, and configure idle/cycle timers.
- **Wayland Layer-Shell Surface Host (`zwlr_layer_shell_v1`)**:
  - **Overlay Mode (`--saver` / `--lock`)**: Spawns borderless fullscreen `GTK_LAYER_SHELL_LAYER_OVERLAY` surfaces across every connected Wayland monitor.
  - **Live Desktop Wallpaper Mode (`--wallpaper`)**: Renders any screensaver directly on `GTK_LAYER_SHELL_LAYER_BACKGROUND` behind your desktop windows with configurable FPS capping.
- **Native PAM Lock Screen (`libpam`)**: Glassmorphic HUD clock and password prompt that authenticates directly against Linux PAM, with optional delegation to `hyprlock` or `swaylock`.
- **Multi-Monitor Topologies**: Choose between **Independent Random** (different screensaver per monitor), **Synchronized Clone**, or **Per-Monitor Assignment** (`DP-1`, `HDMI-A-1`, etc.).
- **Wayland Idle Daemon (`--daemon`)**: Automatic idle activation with PipeWire/PulseAudio media playback and fullscreen window inhibition.

---

## CLI Usage

```bash
# Launch the WScreenSavers Control Center GUI
wscreensavers

# Launch fullscreen Wayland screensaver overlay across all monitors
wscreensavers --saver

# Launch fullscreen Wayland screensaver with PAM Lock Screen
wscreensavers --lock

# Launch a specific screensaver as a live Wayland desktop wallpaper
wscreensavers --wallpaper --saver-id flurry

# Run the background Wayland idle & rotation daemon
wscreensavers --daemon
```

---

## Building from Source

```bash
make build
make test
```

## License

GNU General Public License v3.0 (`GPL-3.0-or-later`).
