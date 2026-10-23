# Unlocking All 330+ XScreenSaver Visualizers

WScreenSavers ships with **23 built-in WebGL2/Canvas visualizers** that run out of the box with zero external dependencies.

However, WScreenSavers also includes an **XScreenSaver Universal Bridge**. When you install your Linux distribution's standard XScreenSaver packages, WScreenSavers automatically discovers all **310+ classic and 3D OpenGL hacks** located in `/usr/lib/xscreensaver/` or `/usr/libexec/xscreensaver/`, parses their original XML option definitions, and seamlessly streams them into native Wayland layer-shell surfaces.

---

## Quick Reference by Distribution

Select your Linux distribution for copy-paste installation commands:

| Distribution | Package Manager | Quick Command | Dedicated Guide |
| :--- | :--- | :--- | :--- |
| **Arch Linux / Manjaro / CachyOS** | `pacman` | `sudo pacman -S xscreensaver rss-glx` | [Arch Guide](distros/arch.md) |
| **Debian / Ubuntu / Linux Mint** | `apt` | `sudo apt install xscreensaver xscreensaver-gl xscreensaver-gl-extra rss-glx` | [Debian/Ubuntu Guide](distros/debian-ubuntu.md) |
| **Fedora / RHEL / AlmaLinux** | `dnf` | `sudo dnf install xscreensaver-extras xscreensaver-gl-extras rss-glx` | [Fedora Guide](distros/fedora-rhel.md) |
| **openSUSE (Tumbleweed / Leap)** | `zypper` | `sudo zypper in xscreensaver xscreensaver-gl xscreensaver-gl-extra` | [openSUSE Guide](distros/opensuse.md) |
| **Slackware Linux** | `sbopkg` / `sbotools` | `sboinstall xscreensaver rss-glx` | [Slackware Guide](distros/slackware.md) |
| **NixOS** | `nix` | `environment.systemPackages = [ pkgs.xscreensaver ];` | [NixOS Guide](distros/nixos.md) |
| **Alpine Linux** | `apk` | `apk add xscreensaver xscreensaver-gl` | [Alpine Guide](distros/alpine.md) |
| **Gentoo Linux** | `emerge` | `emerge --ask x11-misc/xscreensaver` | [Gentoo Guide](distros/gentoo.md) |

---

## How the Bridge Works

1. **Automatic Discovery**:
   On startup or when clicking **Refresh Catalog**, WScreenSavers scans `/usr/lib/xscreensaver`, `/usr/libexec/xscreensaver`, and `/usr/share/xscreensaver/config`.
2. **XML Parameter Extraction**:
   Each hack's XML config (speed, density, color scheme, wireframe mode, etc.) is parsed into interactive sliders and dropdowns in the WScreenSavers Control Center.
3. **Hardware-Accelerated Wayland Streaming**:
   When activated, an isolated headless virtual display launches the hack with full OpenGL acceleration, and frames are streamed with sub-millisecond latency directly onto your Wayland layer-shell windows (`zwlr_layer_shell_v1`).
4. **Zero X11 Dependency on Your Desktop**:
   Your desktop remains 100% pure Wayland. No root X11 window or XWayland desktop integration is required.

---

## Verifying Discovery

After installing your distro's XScreenSaver packages, verify discovery using the CLI:

```bash
# View total detected screensavers
wscreensavers ctl status | grep -o '"savers":\[[^]]*\]' | grep -o '"id":' | wc -l

# Enable all discovered hacks in the rotation pool
wscreensavers ctl pool all

# Test launch a classic hack (e.g., Endgame, Anemone, Sonar)
wscreensavers ctl launch xss_endgame
```
