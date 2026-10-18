APP_NAME := wscreensavers
PREFIX ?= /usr
BINDIR := $(PREFIX)/bin
DESKTOPDIR := $(PREFIX)/share/applications
ICONDIR := $(PREFIX)/share/icons/hicolor/scalable/apps
SYSTEMDUSERDIR := $(PREFIX)/lib/systemd/user

.PHONY: all frontend build test run daemon saver lock wallpaper clean install

all: build

frontend:
	cd frontend && npm install && npm run build

build: frontend
	go build -tags "desktop,production,webkit2_41" -ldflags="-s -w" -o $(APP_NAME) .

test:
	go test -v ./internal/...

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

clean:
	rm -f $(APP_NAME)
	rm -rf frontend/dist
