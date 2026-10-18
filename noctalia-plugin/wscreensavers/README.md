# WScreenSavers — Noctalia Plugin (`christopher/wscreensavers`)

Native Noctalia 5.0 (`plugin_api = 9`) bar widget and floating control panel for **WScreenSavers**.

## Features

- **Bar Widget (`christopher/wscreensavers:saver`)**:
  - Displays a TV/monitor icon (`device-tv` by default, configurable in Noctalia settings) and optional active screensaver name.
  - Hover tooltip displays the selected screensaver, activation mode, idle timeout, multi-monitor topology, and Live Desktop Wallpaper status.
  - Clicking toggles the floating **WScreenSavers Control Panel**.
- **Floating Control Panel (`christopher/wscreensavers:controls`)**:
  - **Quick Actions**: `Activate Now`, `Lock Screen (PAM)`, `Randomize`, and `Studio GUI` (opens the full Wails 3D WebGL preview & parameter editor).
  - **Idle Daemon & Lock Controls**: Switch between `Random Pool`, `Single Hack`, `Cycle Pool`, or `Disabled`; set idle blank timeout (`5m`–`60m`); pick multi-monitor mode (`Independent Random`, `Synchronized Clone`, `Per-Monitor`); and toggle `PAM Lock`, `Audio Inhibit`, `Fullscreen Inhibit`, and `Clock HUD`.
  - **Live Desktop Wallpaper (`zwlr_layer_shell_v1`)**: Start or stop any screensaver on the Wayland desktop background layer and adjust the FPS cap (`15 / 30 / 45 / 60 FPS`).
  - **Interactive Catalog**: Search and filter all 22 built-in Wayland visualizers (plus any installed XScreenSaver hacks) and click **Select**, **Launch**, or **Wallpaper** on any item.

## IPC Commands & Keybinds

```bash
# Toggle the WScreenSavers floating panel
noctalia msg panel-toggle christopher/wscreensavers:controls

# Trigger actions via widget IPC
noctalia msg widget-ipc christopher/wscreensavers:saver launch
noctalia msg widget-ipc christopher/wscreensavers:saver lock
noctalia msg widget-ipc christopher/wscreensavers:saver randomize
noctalia msg widget-ipc christopher/wscreensavers:saver wallpaper
```
