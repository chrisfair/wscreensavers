Name:           wscreensavers
Version:        1.1.33
Release:        1%{?dist}
Summary:        Native Wayland version of XScreenSaver with live desktop wallpapers

License:        GPL-3.0-or-later
URL:            https://github.com/chrisfair/wscreensavers
Source0:        https://github.com/chrisfair/%{name}/archive/refs/tags/v%{version}.tar.gz

BuildRequires:  golang >= 1.22
BuildRequires:  nodejs
BuildRequires:  npm
BuildRequires:  pkgconfig
BuildRequires:  gtk3-devel
BuildRequires:  webkit2gtk4.1-devel
BuildRequires:  gtk-layer-shell-devel
BuildRequires:  pam-devel

Requires:       gtk3
Requires:       webkit2gtk4.1
Requires:       gtk-layer-shell
Requires:       pam
Recommends:     xscreensaver
Recommends:     xorg-x11-server-Xvfb
Recommends:     ffmpeg

%description
WScreenSavers is a native Wayland screensaver and live desktop wallpaper
suite featuring 33 built-in WebGL/Canvas visualizers, an XScreenSaver XML
bridge, PAM-authenticated screen locking, and layer-shell integration
compatible with Hyprland, Sway, River, and Wayfire.

%prep
%autosetup -n %{name}-%{version}

%build
make build

%install
%make_install PREFIX=/usr

%files
%license LICENSE
%doc README.md
%{_bindir}/wscreensavers
%{_datadir}/applications/wscreensavers.desktop
%{_datadir}/icons/hicolor/scalable/apps/wscreensavers.svg
%{_mandir}/man1/wscreensavers.1*
%{_userunitdir}/wscreensavers.service
%{_datadir}/wscreensavers/nag
%{_datadir}/wscreensavers/noctalia-plugins/wscreensavers/*

%changelog
* Mon Nov 23 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.33-1
- Release v1.1.33: fix Wayland idle tracker launching screensaver during continuous typing (return 0 idle seconds whenever ext-idle-notify-v1 reports the seat active) and clean up remaining UI emojis

* Mon Nov 23 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.32-1
- Release v1.1.32: default Safe for Work mode (safeForWork) to ON (opt-out) across config, Desktop Control Center, and Noctalia plugin

* Mon Nov 23 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.31-1
- Release v1.1.31: add Safe for Work mode (safeForWork) across daemon, CLI, Desktop Control Center, and Noctalia plugin to hide and exclude rude/NSFW hacks (handsy, webcollage, vidwhacker, noseguy, stonerview)

* Fri Nov 20 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.30-1
- Release v1.1.30: upgrade zourcegit to zource v0.1.4 file-count-driven faceted polyhedra and add Classical Sculptures Gallery (3D) featuring 8 public-domain works with 360-degree orbits and museum location plaques

* Wed Nov 18 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.29-1
- Release v1.1.29: pass table { action = "off"|"on" } to Hyprland 0.57+ Lua hl.dsp.dpms and deduplicate SetDPMS standby so locked monitors stay pitch black without backlight toggling

* Mon Nov 16 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.28-1
- Release v1.1.28: add Zource Git self-hosting history screensaver (built-in 3D bubbles/2D tree port and native /usr/bin/zource Zig engine bridge)

* Mon Nov 16 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.27-1
- Release v1.1.27: support Hyprland 0.57+ Lua hl.dsp.dpms IPC for hardware backlight standby and discover live Wayland/compositor sockets in systemd daemon

* Sun Nov 15 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.26-1
- Release v1.1.26: power off monitor backlights via compositor DPMS standby on blank and hide pointer cursor on lock/saver overlays

* Sat Nov 14 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.25-1
- Release v1.1.25: pause/mute audio playback on lock, resume prior playback on unlock, and stop active recordings on lock

* Tue Oct 27 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.9-1
- Release v1.1.9: migrate desktop Control Center from Wails v2 to Wails v3 (v3.0.0) with GTK3/WebKit2GTK 4.1 service bindings

* Mon Oct 26 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.8-1
- Release v1.1.8: set pass-through empty input region on wallpaper layer surfaces, isolate Xvfb child env from Wayland display, and fix ctl wallpaper selection

* Mon Oct 26 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.7-1
- Release v1.1.7: throttle WebKit animation loops and Xvfb/ffmpeg threads, auto-pause unfocused preview, and avoid compositor DPMS races

* Mon Oct 26 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.6-1
- Release v1.1.6: add CLI/API/GUI version reporting and desktop application menu header bar

* Mon Oct 26 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.5-1
- Release v1.1.5: preserve lock overlay across DPMS screen-off, prevent cross-monitor password input echo, and cap Xvfb llvmpipe threads

* Sun Oct 25 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.1.2-1
- Release v1.1.2: fix multi-monitor wake synchronization, rss-glx Xvfb vsync/DPMS arguments, and Wayland idle poll EINTR handling

* Fri Oct 23 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.0.28-1
- Release v1.0.28 with Apex 3D Chess screensaver (bughouse3d), HUD watermark, and clean visualizer improvements

* Fri Oct 23 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.0.27-1
- Release v1.0.27 with unique per-monitor live wallpaper support and screensaver auto-pause

* Fri Oct 23 2026 Christopher Patrick Fair <christopherpatrickfair@gmail.com> - 1.0.26-1
- Release v1.0.26 with Noctalia panel paging and live wallpaper improvements
