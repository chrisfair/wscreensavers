# Installing XScreenSavers on Slackware Linux

Applies to: **Slackware Linux 15.0** and **Slackware -current**.

---

## 1. Package Installation via SlackBuilds (SBo)

On Slackware, complete monolithic builds of XScreenSaver (with all classic and OpenGL visualizers enabled) are available via SlackBuilds.org.

### Using `sbotools`:
```bash
sboinstall xscreensaver rss-glx xvfb-run ffmpeg
```

### Using `sbopkg`:
```bash
sbopkg -i "xscreensaver rss-glx"
```

### Manual SlackBuild Compilation:
1. Download source and SlackBuild from [SlackBuilds.org xscreensaver](https://slackbuilds.org/repository/15.0/x11/xscreensaver/).
2. Run as root:
   ```bash
   ./xscreensaver.SlackBuild
   installpkg /tmp/xscreensaver-*.txz
   ```

---

## 2. Enabling in WScreenSavers

Slackware installs hacks to `/usr/libexec/xscreensaver` or `/usr/lib64/xscreensaver`. WScreenSavers automatically checks both search paths on startup:

```bash
wscreensavers ctl status
wscreensavers ctl pool all
wscreensavers ctl launch xss_endgame
```
