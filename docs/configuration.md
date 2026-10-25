# Compositor & CLI Configuration Guide

WScreenSavers runs on standard Wayland protocols (`zwlr_layer_shell_v1` and `ext-idle-notify-v1`) and integrates natively with Hyprland, Sway, River, Wayfire, and KDE.

---

## 1. Compositor Setup

### Hyprland (`~/.config/hypr/hyprland.conf`)

```ini
# Start the WScreenSavers idle daemon on login
exec-once = wscreensavers --daemon

# Keybinding: Lock screen immediately
bind = $mainMod, L, exec, wscreensavers --lock

# Keybinding: Launch screensaver preview overlay
bind = $mainMod SHIFT, S, exec, wscreensavers --saver

# Keybinding: Toggle live desktop wallpaper
bind = $mainMod ALT, W, exec, wscreensavers ctl wallpaper toggle
```

### Sway (`~/.config/sway/config`)

```ini
# Start the idle daemon
exec wscreensavers --daemon

# Lock screen shortcut
bindsym $mod+l exec wscreensavers --lock

# Immediate screensaver
bindsym $mod+Shift+s exec wscreensavers --saver

# Toggle live wallpaper
bindsym $mod+Alt+w exec wscreensavers ctl wallpaper toggle
```

### River (`~/.config/river/init`)

```bash
# Start idle daemon
riverctl spawn "wscreensavers --daemon"

# Keybinding to lock
riverctl map normal Super L spawn "wscreensavers --lock"
```

---

## 2. Systemd User Service

To automatically manage the background idle daemon as a user unit:

```bash
# Enable and start daemon
systemctl --user enable --now wscreensavers.service

# Check status
systemctl --user status wscreensavers.service
```

---

## 3. CLI Control Tool (`wscreensavers ctl`)

WScreenSavers includes a comprehensive command-line control tool for shell scripts, hotkeys, and bar integrations:

### Core Controls
```bash
# Launch screensaver overlay immediately
wscreensavers ctl launch

# Launch a specific screensaver by ID
wscreensavers ctl launch chessopenings
wscreensavers ctl launch glmatrix
wscreensavers ctl launch flurry

# Lock screen immediately (PAM glassmorphic lock or configured locker)
wscreensavers ctl lock

# Stop active screensaver or unlock
wscreensavers ctl stop

# Pick a random screensaver from the enabled pool and launch
wscreensavers ctl randomize launch

# Open the graphical Control Center Studio
wscreensavers ctl gui
```

### Live Wallpaper Controls
```bash
# Toggle live desktop wallpaper on/off
wscreensavers ctl wallpaper toggle

# Force wallpaper on or off
wscreensavers ctl wallpaper on
wscreensavers ctl wallpaper off

# Set wallpaper to a specific visualizer
wscreensavers ctl wallpaper flurry

# Shuffle wallpaper across all connected displays
wscreensavers ctl wallpaper shuffle
```

### Rotation Pool Management
```bash
# Add all 330+ installed screensavers to rotation pool
wscreensavers ctl pool all

# Clear rotation pool
wscreensavers ctl pool none

# Toggle a specific saver in/out of the pool
wscreensavers ctl pool toggle glmatrix
```

### Settings & Configuration (`ctl set`)
```bash
# Set screensaver mode: "single", "random", or "cycle"
wscreensavers ctl set mode random

# Set multi-monitor mode: "independent" or "clone"
wscreensavers ctl set multiMonitorMode independent

# Set idle timeout in minutes
wscreensavers ctl set idleTimeoutMinutes 15

# Set wallpaper FPS cap (15, 30, 45, or 60)
wscreensavers ctl set wallpaperFpsCap 30

# Inhibit screensaver when PipeWire / PulseAudio is playing
wscreensavers ctl set inhibitOnAudio true

# Inhibit screensaver when a fullscreen application or game is active
wscreensavers ctl set inhibitOnFullscreen true
```

### Voluntary Support Reminder Management
```bash
# Permanently disable the startup support reminder
wscreensavers ctl nag off

# Check support reminder status
wscreensavers ctl nag status
```
