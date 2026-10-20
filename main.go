package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"math/rand"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"

	"wscreensavers/internal/api"
	"wscreensavers/internal/config"
	"wscreensavers/internal/ctl"
	"wscreensavers/internal/display"
	"wscreensavers/internal/layershell"
)

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	// Ensure hardware GPU acceleration is not overridden by stale shell env vars
	_ = os.Unsetenv("LIBGL_ALWAYS_SOFTWARE")
	// Prevent WebKit2GTK DMA-BUF Wayland protocol crashes on NVIDIA / Hyprland setups
	if os.Getenv("WEBKIT_DISABLE_DMABUF_RENDERER") == "" {
		_ = os.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1")
	}
	rand.Seed(time.Now().UnixNano())
}

func main() {
	cfgMgr, err := config.NewManager("")
	if err != nil {
		log.Fatalf("Failed to initialize config manager: %v", err)
	}

	if len(os.Args) >= 2 && os.Args[1] == "ctl" {
		if err := ctl.Run(cfgMgr, os.Args[2:]); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
		return
	}

	var (
		saverMode     = flag.Bool("saver", false, "Launch fullscreen Wayland screensaver overlay across all monitors")
		lockMode      = flag.Bool("lock", false, "Launch fullscreen locked Wayland screensaver overlay across all monitors")
		wallpaperMode = flag.Bool("wallpaper", false, "Launch Wayland background layer-shell live wallpaper across all monitors")
		daemonMode    = flag.Bool("daemon", false, "Run headless Wayland idle & cycle daemon")
		webMode       = flag.Bool("web", false, "Run Control Center as local web server on 127.0.0.1:8642")
		saverIDFlag   = flag.String("saver-id", "", "Specific screensaver ID to run")
		serverURLFlag = flag.String("server-url", "", "Existing local wscreensavers API server URL")
		listenAddr    = flag.String("addr", "127.0.0.1:8642", "HTTP API listen address")
	)
	flag.Parse()

	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		distFS = assets
	}

	srv := api.NewServer(cfgMgr, distFS)

	// Mode 1: Child or standalone Wayland Layer-Shell Overlay / Wallpaper
	if *saverMode || *lockMode || *wallpaperMode {
		baseURL := *serverURLFlag
		if baseURL == "" {
			startedURL, err := srv.StartHTTP("127.0.0.1:0")
			if err != nil {
				log.Fatalf("Failed to start embedded asset server: %v", err)
			}
			baseURL = startedURL
		}
		defer srv.Shutdown()

		urls := buildMonitorURLs(baseURL, cfgMgr, srv, *saverIDFlag, *wallpaperMode, *lockMode)
		layershell.RunLayerShellWindows(urls, *wallpaperMode, *lockMode)
		return
	}

	// Start local API server for Daemon, Web, or GUI modes
	baseURL, err := srv.StartHTTP(*listenAddr)
	if err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}
	_ = os.Setenv("WSCREENSAVERS_API_URL", baseURL)

	// Mode 2: Headless Wayland Idle Daemon (--daemon) or Web Server (--web)
	if *daemonMode || *webMode {
		log.Printf("wscreensavers daemon/server active at %s", baseURL)
		stopCh := make(chan struct{})
		go srv.StartIdleDaemonLoop(stopCh)

		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		close(stopCh)
		srv.Shutdown()
		return
	}

	// Mode 3: Native Wails v2 Desktop Control Center
	app := NewApp(cfgMgr, srv)
	err = wails.Run(&options.App{
		Title:     "WScreenSavers — Wayland Screensaver & Wallpaper Suite",
		Width:     1400,
		Height:    900,
		MinWidth:  1024,
		MinHeight: 680,
		AssetServer: &assetserver.Options{
			Assets:  distFS,
			Handler: srv.Handler(),
		},
		BackgroundColour: &options.RGBA{R: 9, G: 11, B: 17, A: 255},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
		Linux: &linux.Options{
			ProgramName: "wscreensavers",
		},
	})
	if err != nil {
		log.Fatalf("Error running Wails application: %v", err)
	}
}

func buildMonitorURLs(baseURL string, cfgMgr *config.Manager, srv *api.Server, explicitSaverID string, isWallpaper bool, isLocked bool) []string {
	cfg := cfgMgr.Get()
	monitors := display.DetectMonitors()
	if len(monitors) == 0 {
		monitors = append(monitors, display.DetectMonitors()...)
	}

	var urls []string
	for idx, mon := range monitors {
		chosenSaver := explicitSaverID
		if isWallpaper {
			if perMon, ok := cfg.WallpaperPerMonitor[mon.Name]; ok && perMon != "" && explicitSaverID == "" {
				chosenSaver = perMon
			}
			if chosenSaver == "" {
				chosenSaver = cfg.WallpaperSaver
			}
			if chosenSaver == "" {
				chosenSaver = "flurry"
			}
		} else {
			if chosenSaver == "" {
				switch cfg.MultiMonitorMode {
				case "per-monitor":
					if assigned, ok := cfg.PerMonitorSaver[mon.Name]; ok && assigned != "" {
						chosenSaver = assigned
					}
				case "independent":
					chosenSaver = srv.PickRandomSaver()
				case "clone":
					if idx == 0 {
						if cfg.Mode == "random" || cfg.Mode == "cycle" {
							chosenSaver = srv.PickRandomSaver()
						} else {
							chosenSaver = cfg.SelectedSaver
						}
					}
				}
			}
			if chosenSaver == "" {
				chosenSaver = cfg.SelectedSaver
			}
			if chosenSaver == "" {
				chosenSaver = "glmatrix"
			}
		}

		q := url.Values{}
		q.Set("mode", "fullscreen")
		q.Set("saver", chosenSaver)
		q.Set("monitor", mon.Name)
		q.Set("api", baseURL)
		if isWallpaper {
			q.Set("wallpaper", "1")
			q.Set("fps", fmt.Sprintf("%d", cfg.WallpaperFPSCap))
		}
		if isLocked {
			q.Set("locked", "1")
		}
		if cfg.ShowClockOnSaver {
			q.Set("clock", "1")
		}
		q.Set("dpms", fmt.Sprintf("%d", cfg.DPMSOffMinutes))

		target := fmt.Sprintf("%s/?%s", baseURL, q.Encode())
		urls = append(urls, target)
	}

	if cfg.MultiMonitorMode == "clone" && !isWallpaper && len(urls) > 1 {
		for i := 1; i < len(urls); i++ {
			urls[i] = urls[0]
		}
	}

	return urls
}
