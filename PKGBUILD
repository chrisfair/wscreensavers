# Maintainer: Christopher Fair <chrisfair@users.noreply.github.com>
pkgname=wscreensavers
pkgver=1.0.0
pkgrel=3
pkgdesc="Native Wayland version of XScreenSaver with 22 built-in WebGL/Canvas ports, XScreenSaver XML bridge, PAM lock screen, and live desktop wallpaper mode"
arch=('x86_64' 'aarch64')
url="https://github.com/chrisfair/wscreensavers"
license=('GPL-3.0-or-later')
depends=('gtk3' 'webkit2gtk-4.1' 'gtk-layer-shell' 'pam' 'xscreensaver' 'xorg-server-xvfb' 'ffmpeg')
optdepends=(
  'rss-glx: Really Slick Screensavers 3D OpenGL collection'
  'wlr-randr: Multi-monitor output detection on wlroots compositors'
  'hyprlock: Optional external Wayland lock provider'
  'swaylock: Optional external Wayland lock provider'
)
makedepends=('go' 'nodejs' 'npm' 'pkgconf')
source=()
sha256sums=()

build() {
  cd "${startdir}"
  make build
}

check() {
  cd "${startdir}"
  make test
}

package() {
  cd "${startdir}"
  make DESTDIR="${pkgdir}" PREFIX=/usr install
  install -Dm644 LICENSE "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
}
