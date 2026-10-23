# Installing XScreenSavers on Arch Linux & Derivatives

Applies to: **Arch Linux**, **CachyOS**, **EndeavourOS**, **Manjaro**, and **Garuda Linux**.

---

## 1. Package Installation

Arch Linux packages XScreenSaver into two main repositories:

```bash
sudo pacman -S --needed xscreensaver rss-glx xorg-server-xvfb ffmpeg
```

### Included Packages:
* **`xscreensaver`**: Contains all 200+ classic 2D and 3D OpenGL hacks installed to `/usr/lib/xscreensaver/` along with XML parameter definitions in `/usr/share/xscreensaver/config/`.
* **`rss-glx`**: Really Slick Screensavers (BioF, Busyspheres, Colorfire, Cyclone, Euphoria, Fieldlines, Flocks, Flux, Helios, Hyperspace, Lattice, Plasma, Skyrocket, Solarwinds).
* **`xorg-server-xvfb`**: Provides headless Xvfb for isolated virtual framebuffer streaming.
* **`ffmpeg`**: Provides low-latency streaming pipeline acceleration.

---

## 2. Enabling in WScreenSavers

Once installed, WScreenSavers automatically registers the new hacks. Open the catalog or run:

```bash
# Verify hacks are recognized
wscreensavers ctl status

# Add all 330+ hacks to your active rotation pool
wscreensavers ctl pool all

# Test launch an OpenGL classic
wscreensavers ctl launch xss_anemone
```
