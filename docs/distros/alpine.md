# Installing XScreenSavers on Alpine Linux

Applies to: **Alpine Linux (v3.18 / v3.19 / v3.20 / edge)**.

---

## 1. Package Installation

Enable the `community` repository in `/etc/apk/repositories` if not already active, then run:

```bash
sudo apk update
sudo apk add \
  xscreensaver \
  xscreensaver-gl \
  xvfb \
  ffmpeg
```

---

## 2. Enabling in WScreenSavers

```bash
wscreensavers ctl status
wscreensavers ctl pool all
wscreensavers ctl launch xss_anemone
```
