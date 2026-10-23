# Installing XScreenSavers on Gentoo Linux

Applies to: **Gentoo Linux**.

---

## 1. Package Installation

Configure USE flags for `x11-misc/xscreensaver` to ensure 3D OpenGL visualizers are compiled:

```bash
# /etc/portage/package.use/xscreensaver
x11-misc/xscreensaver opengl gdk-pixbuf pam -gnome
```

Install the package and streaming dependencies:

```bash
sudo emerge --ask --verbose \
  x11-misc/xscreensaver \
  x11-misc/rss-glx \
  x11-base/xorg-server \
  media-video/ffmpeg
```

---

## 2. Enabling in WScreenSavers

```bash
wscreensavers ctl status
wscreensavers ctl pool all
wscreensavers ctl launch xss_endgame
```
