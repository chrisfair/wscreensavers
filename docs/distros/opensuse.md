# Installing XScreenSavers on openSUSE

Applies to: **openSUSE Tumbleweed**, **openSUSE Leap 15.x**, and **SUSE Linux Enterprise**.

---

## 1. Package Installation

Install the complete XScreenSaver suite and headless streaming dependencies:

```bash
sudo zypper refresh
sudo zypper install -y \
  xscreensaver \
  xscreensaver-data \
  xscreensaver-data-extra \
  xscreensaver-gl \
  xscreensaver-gl-extra \
  xorg-x11-Xvfb \
  ffmpeg
```

*Note: For `rss-glx` on openSUSE, install via the openSUSE Build Service (OBS) or your community repository (`opi rss-glx`).*

---

## 2. Enabling in WScreenSavers

```bash
# Verify hacks are discovered
wscreensavers ctl status

# Add all hacks to rotation pool
wscreensavers ctl pool all

# Test launch a classic hack
wscreensavers ctl launch xss_glknots
```
