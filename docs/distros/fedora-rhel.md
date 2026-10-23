# Installing XScreenSavers on Fedora & Enterprise Linux

Applies to: **Fedora (38/39/40+)**, **Red Hat Enterprise Linux (RHEL 8/9+)**, **CentOS Stream**, **AlmaLinux**, and **Rocky Linux**.

---

## 1. Package Installation

Fedora splits XScreenSaver across base and extra packages:

```bash
sudo dnf install -y \
  xscreensaver-base \
  xscreensaver-extras \
  xscreensaver-gl-base \
  xscreensaver-gl-extras \
  rss-glx \
  xorg-x11-server-Xvfb \
  ffmpeg
```

*Note on RHEL / AlmaLinux / Rocky Linux: If `rss-glx` or `xscreensaver-gl-extras` are in EPEL, ensure EPEL is enabled first (`sudo dnf install epel-release`).*

### Package Breakdown:
* **`xscreensaver-base`**: Core utilities and foundational visualizers.
* **`xscreensaver-extras`**: Complete catalog of 2D classic hacks.
* **`xscreensaver-gl-base`**: Standard 3D OpenGL visualizers.
* **`xscreensaver-gl-extras`**: Complex 3D OpenGL visualizers.
* **`rss-glx`**: Really Slick Screensavers suite.
* **`xorg-x11-server-Xvfb`**: Headless X11 virtual frame buffer for Wayland streaming.

---

## 2. Enabling in WScreenSavers

```bash
# Verify discovery
wscreensavers ctl status

# Add all hacks into pool
wscreensavers ctl pool all

# Test launch a classic hack
wscreensavers ctl launch xss_anemone
```
