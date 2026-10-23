APP_NAME := wscreensavers
PREFIX ?= /usr
BINDIR := $(PREFIX)/bin
DESKTOPDIR := $(PREFIX)/share/applications
ICONDIR := $(PREFIX)/share/icons/hicolor/scalable/apps
SYSTEMDUSERDIR := $(PREFIX)/lib/systemd/user
NOCTALIADIR := $(HOME)/.config/noctalia/plugins/wscreensavers
PLUGINSRCDIR := $(PREFIX)/share/wscreensavers/noctalia-plugins/wscreensavers

.PHONY: all frontend build test coverage pkg pacman pacman-install aur deb rpm appimage flatpak snap slackbuild slackware install-noctalia run daemon saver lock wallpaper clean install

all: build

frontend:
	cd frontend && npm install && npm run build

build: frontend
	go build -tags "desktop,production,webkit2_41" -ldflags="-s -w" -o $(APP_NAME) .

test:
	@echo "==> Running unit tests with coverage..."
	go test -v -coverprofile=coverage.out -covermode=atomic ./internal/...
	@echo ""
	@echo "==> Coverage Summary by Function:"
	@go tool cover -func=coverage.out
	@echo ""
	@go tool cover -func=coverage.out | tail -n 1 | awk '{print "==> TOTAL TEST COVERAGE: " $$3}'

coverage: test
	go tool cover -html=coverage.out -o coverage.html
	@echo "==> HTML coverage report written to coverage.html"

pacman: test
	@echo "==> Building Arch Linux pacman package..."
	rm -f $(APP_NAME)-*.pkg.tar*
	makepkg -f -d --noconfirm
	@echo ""
	@echo "==> Built Pacman Package:"
	@ls -lh $(APP_NAME)-*.pkg.tar*

pkg: pacman

pacman-install: pacman
	sudo pacman -U --noconfirm $(APP_NAME)-*.pkg.tar*

aur:
	./scripts/push-aur.sh

deb: test
	@echo "==> Building Debian package..."
	bash ./packaging/debian/build-deb.sh

rpm: test
	@echo "==> Building RPM package..."
	bash ./packaging/rpm/build-rpm.sh

appimage: test
	@echo "==> Building AppImage package..."
	bash ./packaging/appimage/build-appimage.sh

flatpak:
	@echo "==> Building Flatpak package..."
	bash ./packaging/flatpak/build-flatpak.sh

snap:
	@echo "==> Building Snap package..."
	bash ./packaging/snap/build-snap.sh

slackbuild: test
	@echo "==> Building Slackware package..."
	bash ./packaging/slackware/wscreensavers.SlackBuild

slackware: slackbuild

install-noctalia:
	mkdir -p "$(NOCTALIADIR)/translations"
	install -Dm644 noctalia-plugin/wscreensavers/plugin.toml "$(NOCTALIADIR)/plugin.toml"
	install -Dm644 noctalia-plugin/wscreensavers/widget.luau "$(NOCTALIADIR)/widget.luau"
	install -Dm644 noctalia-plugin/wscreensavers/panel.luau "$(NOCTALIADIR)/panel.luau"
	install -Dm644 noctalia-plugin/wscreensavers/README.md "$(NOCTALIADIR)/README.md"
	install -Dm644 noctalia-plugin/wscreensavers/translations/en.json "$(NOCTALIADIR)/translations/en.json"

run: build
	WEBKIT_DISABLE_DMABUF_RENDERER=1 ./$(APP_NAME)

daemon: build
	WEBKIT_DISABLE_DMABUF_RENDERER=1 ./$(APP_NAME) --daemon

saver: build
	WEBKIT_DISABLE_DMABUF_RENDERER=1 ./$(APP_NAME) --saver

lock: build
	WEBKIT_DISABLE_DMABUF_RENDERER=1 ./$(APP_NAME) --lock

wallpaper: build
	WEBKIT_DISABLE_DMABUF_RENDERER=1 ./$(APP_NAME) --wallpaper

install:
	install -Dm755 $(APP_NAME) "$(DESTDIR)$(BINDIR)/$(APP_NAME)"
	install -Dm644 wscreensavers.desktop "$(DESTDIR)$(DESKTOPDIR)/wscreensavers.desktop"
	install -Dm644 wscreensavers.svg "$(DESTDIR)$(ICONDIR)/wscreensavers.svg"
	install -Dm644 wscreensavers.service "$(DESTDIR)$(SYSTEMDUSERDIR)/wscreensavers.service"
	install -Dm644 nag "$(DESTDIR)$(PREFIX)/share/wscreensavers/nag"
	cd noctalia-plugin/wscreensavers && find . -type f -exec install -Dm644 {} "$(DESTDIR)$(PLUGINSRCDIR)/{}" \;

clean:
	rm -f $(APP_NAME) coverage.out coverage.html
	rm -f $(APP_NAME)-*.pkg.tar* $(APP_NAME)-*.tar.gz
	rm -rf frontend/dist frontend/node_modules pkg src
