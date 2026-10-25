# Noctalia Integration Guide

This guide covers how to install, register, and configure the official **WScreenSavers** plugin for the **Noctalia** Wayland desktop shell (`christopherpfair/wscreensavers`).

---

## 1. Prerequisites

1. **`wscreensavers` installed**:
   - The Noctalia plugin is a control surface that communicates with `wscreensavers ctl`.
   - Ensure `wscreensavers` is installed and reachable in your `PATH` (or at `~/bin/wscreensavers`).
2. **Idle Daemon Active**:
   - For automatic blanking and cycling on idle, enable the systemd user service:
     ```bash
     systemctl --user enable --now wscreensavers.service
     ```
3. **Noctalia 5.x** (`plugin_api = 9` or later).

---

## 2. Registering the Plugin Repository

You can install the plugin via either the **Remote Git Source** or the **Local Package Source**.

### Option A: Remote Git Source (Recommended)
Add the official plugin repository directly from Git:

```bash
# 1. Register the plugin repository source
noctalia msg plugins source add chrisfair git https://gitlab.com/chrisfair/noctalia-plugins

# 2. Fetch the latest plugin metadata
noctalia msg plugins update chrisfair

# 3. Enable the WScreenSavers plugin
noctalia msg plugins enable christopherpfair/wscreensavers
```

### Option B: Local System Source (If installed via AUR, .deb, or RPM)
If you installed WScreenSavers via your package manager, the plugin files are already installed to `/usr/share/wscreensavers/noctalia-plugins`. You can register them as a local source:

```bash
# 1. Register the local path source
noctalia msg plugins source add wscreensavers path /usr/share/wscreensavers/noctalia-plugins

# 2. Update and enable
noctalia msg plugins update wscreensavers
noctalia msg plugins enable christopherpfair/wscreensavers
```

### Option C: Developer Install from Source
From the `wscreensavers` repository root:
```bash
make install-noctalia
noctalia msg plugins enable christopherpfair/wscreensavers
```

---

## 3. Adding the Widget to your Noctalia Bar

Once the plugin is enabled, add the widget to your Noctalia bar configuration:

1. Open your Noctalia configuration (or use the Noctalia Settings GUI).
2. Add `christopherpfair/wscreensavers:saver` to your bar's widget list:
   ```toml
   # Example: ~/.config/noctalia/config.toml
   [bar]
   widgets_right = [
     "christopherpfair/wscreensavers:saver",
     "volume",
     "battery",
     "clock"
   ]
   ```
3. The widget displays a TV/monitor icon (`device-tv`) with the active screensaver name.
4. **Hovering**: Displays activation mode, idle timeout, multi-monitor topology, and live wallpaper state.
5. **Clicking**: Toggles the floating **WScreenSavers Control Deck**.

---

## 4. Floating Control Deck Features

The floating panel (`christopherpfair/wscreensavers:controls`) offers comprehensive control:

* **Quick Action Row**:
  - `Activate`: Immediately triggers the screensaver overlay.
  - `Lock`: Immediately engages the PAM screen locker.
  - `Randomize`: Picks a fresh screensaver from the active pool and activates it.
  - `Control Center`: Launches the full 3D visual preview studio (`wscreensavers ctl gui`).
* **Idle Daemon Configuration**:
  - Activation Mode: `Random Pool`, `Single Hack`, `Cycle Pool`, or `Disabled`.
  - Idle blanking timeouts: `5m`, `10m`, `15m`, `30m`, `60m`.
  - Multi-Monitor Mode: `Independent Random`, `Synchronized Clone`, or `Per-Monitor`.
  - Toggles for `PAM Lock`, `Audio Inhibit`, `Fullscreen Inhibit`, and floating `HUD Clock`.
* **Live Desktop Wallpaper**:
  - Layout Mode: `Same on All` or `Unique Per Screen`.
  - In **Unique Per Screen** mode, each detected monitor (`HDMI-A-1`, `DP-2`, etc.) is listed with its active wallpaper and a `Use Selected` button.
  - `Randomize Unique Set`: Shuffles distinct wallpapers across all screens without repeats.
  - Background layer FPS cap slider (`15` to `60` FPS).
* **Screensaver Catalog & Category Filter**:
  - Search by name or category.
  - Preview, select, or set as wallpaper on any individual hack.

---

## 5. Compositor Keybindings & IPC

Add these keybindings to your compositor config (`hyprland.conf` or Sway `config`) to control WScreenSavers via Noctalia IPC:

### Hyprland (`~/.config/hypr/hyprland.conf`)
```ini
# Toggle the Noctalia WScreenSavers floating deck
bind = $mainMod, S, exec, noctalia msg panel-toggle christopherpfair/wscreensavers:controls

# Quick triggers via widget IPC
bind = $mainMod, L, exec, noctalia msg widget-ipc christopherpfair/wscreensavers:saver lock
bind = $mainMod SHIFT, S, exec, noctalia msg widget-ipc christopherpfair/wscreensavers:saver launch
bind = $mainMod ALT, W, exec, noctalia msg widget-ipc christopherpfair/wscreensavers:saver wallpaper
```

### Sway (`~/.config/sway/config`)
```ini
bindsym $mod+s exec noctalia msg panel-toggle christopherpfair/wscreensavers:controls
bindsym $mod+l exec noctalia msg widget-ipc christopherpfair/wscreensavers:saver lock
```

---

## 6. Troubleshooting

- **Panel shows "Could not reach wscreensavers ctl"**:
  Ensure `wscreensavers` is in your `PATH` (`which wscreensavers`). If installed in `~/bin/wscreensavers`, make sure `~/bin` is exported in your environment.
- **Other wallpapers showing underneath**:
  WScreenSavers draws on the `zwlr_layer_shell_v1` background layer. If `hyprpaper`, `swww`, or `swaybg` are running, disable them to avoid redundant GPU overhead.
