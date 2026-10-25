# WScreenSavers - Noctalia Plugin (`christopherpfair/wscreensavers`)

Native Noctalia 5.0 (`plugin_api = 9`) bar widget and floating control panel for **WScreenSavers**.

## Requirements

This plugin is only a control surface. It drives the **`wscreensavers`** program
through `wscreensavers ctl`, so that program must be installed:

- **Arch Linux (AUR):** `yay -S wscreensavers` (installs `/usr/bin/wscreensavers`)
- **From source:** https://github.com/chrisfair/wscreensavers (`make build && sudo make install`)
- A Wayland compositor with `zwlr_layer_shell_v1` (Hyprland, Sway, niri, ...).
- Noctalia 5.x (`plugin_api = 9`).

The plugin looks for `~/bin/wscreensavers` first and falls back to `wscreensavers`
on your `PATH`. If neither exists the panel shows "Could not reach wscreensavers ctl".

For the screensaver to start on idle, run the daemon as well:
`systemctl --user enable --now wscreensavers.service`.

## Installing

If you installed the AUR package, the plugin files are already on disk. Register
them once as a source:

```sh
noctalia msg plugins source add wscreensavers path /usr/share/wscreensavers/noctalia-plugins
noctalia msg plugins update wscreensavers
noctalia msg plugins enable christopherpfair/wscreensavers
```

Otherwise add the git source:

```sh
noctalia msg plugins source add chrisfair git https://gitlab.com/chrisfair/noctalia-plugins
noctalia msg plugins update chrisfair
noctalia msg plugins enable christopherpfair/wscreensavers
```

Use one source or the other, not both, because they provide the same plugin id.

## Other wallpapers

The live wallpaper is drawn on the background layer **on top of** any other wallpaper,
including Noctalia's own, hyprpaper, swww and swaybg. Those keep running underneath it,
so turn them off if you do not want them running behind this one. The panel names any
such wallpaper program it finds running (Noctalia's own cannot be detected).

## Features

- **Bar Widget (`christopherpfair/wscreensavers:saver`)**:
  - Displays a TV/monitor icon (`device-tv` by default, configurable in Noctalia settings) and optional active screensaver name.
  - Hover tooltip displays the selected screensaver, activation mode, idle timeout, multi-monitor topology, and Live Desktop Wallpaper status.
  - Clicking toggles the floating **WScreenSavers Control Panel**.
- **Floating Control Panel (`christopherpfair/wscreensavers:controls`)**:
  - **Quick Actions**: `Activate Now`, `Lock Screen (PAM)`, `Randomize`, and `Studio GUI` (opens the full Wails 3D WebGL preview & parameter editor).
  - **Idle Daemon & Lock Controls**: Switch between `Random Pool`, `Single Hack`, `Cycle Pool`, or `Disabled`; set idle blank timeout (`5m`–`60m`); pick multi-monitor mode (`Independent Random`, `Synchronized Clone`, `Per-Monitor`); and toggle `PAM Lock`, `Audio Inhibit`, `Fullscreen Inhibit`, and `Clock HUD`.
  - **Live Desktop Wallpaper (`zwlr_layer_shell_v1`)**: Start or stop any screensaver on the Wayland desktop background layer and adjust the FPS cap (`15 / 30 / 45 / 60 FPS`).
  - **Interactive Catalog**: Search and filter all 22 built-in Wayland visualizers (plus any installed XScreenSaver hacks) and click **Select**, **Launch**, or **Wallpaper** on any item.

## IPC Commands & Keybinds

```bash
# Toggle the WScreenSavers floating panel
noctalia msg panel-toggle christopherpfair/wscreensavers:controls

# Trigger actions via widget IPC
noctalia msg widget-ipc christopherpfair/wscreensavers:saver launch
noctalia msg widget-ipc christopherpfair/wscreensavers:saver lock
noctalia msg widget-ipc christopherpfair/wscreensavers:saver randomize
noctalia msg widget-ipc christopherpfair/wscreensavers:saver wallpaper
```
