# Installing XScreenSavers on Debian, Ubuntu, & Mint

Applies to: **Debian GNU/Linux (11/12/testing)**, **Ubuntu (20.04/22.04/24.04+)**, **Linux Mint**, **Pop!_OS**, and **Zorin OS**.

---

## 1. Package Installation

Debian and Ubuntu split XScreenSaver into several specialized subpackages. To unlock the full library of 330+ hacks, install all component packages:

```bash
sudo apt update
sudo apt install -y \
  xscreensaver \
  xscreensaver-data \
  xscreensaver-data-extra \
  xscreensaver-gl \
  xscreensaver-gl-extra \
  rss-glx \
  xvfb \
  ffmpeg
```

### Package Breakdown:
* **`xscreensaver`**: Core framework and binary dispatcher.
* **`xscreensaver-data`**: Classic standard 2D screensavers.
* **`xscreensaver-data-extra`**: Additional mathematical, retro, and geometric 2D screensavers.
* **`xscreensaver-gl`**: Classic 3D OpenGL visualizers (`glknots`, `superquadrics`, `geodesic`, etc.).
* **`xscreensaver-gl-extra`**: Advanced 3D OpenGL visualizers (`endgame`, `flurry`, `circuit`, `cubestack`, etc.).
* **`rss-glx`**: Port of Terence M. Welsh's Really Slick Screensavers.
* **`xvfb` & `ffmpeg`**: Required headless streaming infrastructure.

---

## 2. Enabling in WScreenSavers

```bash
# Refresh WScreenSavers catalog
wscreensavers ctl status

# Add all discovered hacks to your idle rotation pool
wscreensavers ctl pool all

# Test launch a classic OpenGL hack
wscreensavers ctl launch xss_endgame
```
