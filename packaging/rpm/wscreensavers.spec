Name:           wscreensavers
Version:        1.1.7
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
suite featuring 24 built-in WebGL/Canvas visualizers, an XScreenSaver XML
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
%{_userunitdir}/wscreensavers.service
%{_datadir}/wscreensavers/nag
%{_datadir}/wscreensavers/noctalia-plugins/wscreensavers/*

%changelog
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
