package main

import (
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"wscreensavers/internal/api"
	"wscreensavers/internal/config"
	"wscreensavers/internal/ctl"
	"wscreensavers/internal/display"
	"wscreensavers/internal/idle"
	"wscreensavers/internal/layershell"
	"wscreensavers/internal/models"
	"wscreensavers/internal/singleton"
	"wscreensavers/internal/version"
)

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	// Ensure hardware GPU acceleration is not overridden by stale shell env vars
	_ = os.Unsetenv("LIBGL_ALWAYS_SOFTWARE")
	// Preserve native Wayland GDK backend when WAYLAND_DISPLAY is present
	if os.Getenv("WAYLAND_DISPLAY") != "" {
		if os.Getenv("XDG_SESSION_TYPE") == "" {
			_ = os.Setenv("XDG_SESSION_TYPE", "wayland")
		}
		if os.Getenv("GDK_BACKEND") == "x11" {
			_ = os.Unsetenv("GDK_BACKEND")
		}
	}
	// Prevent WebKit2GTK DMA-BUF Wayland protocol crashes on NVIDIA / Hyprland setups
	if os.Getenv("WEBKIT_DISABLE_DMABUF_RENDERER") == "" {
		_ = os.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1")
	}
	rand.Seed(time.Now().UnixNano())
}

func main() {
	if len(os.Args) >= 2 {
		switch os.Args[1] {
		case "-v", "--version", "-version", "version":
			fmt.Printf("wscreensavers v%s\n", version.Version)
			return
		}
	}

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
		versionFlag   = flag.Bool("version", false, "Print wscreensavers version and exit")
		shortVerFlag  = flag.Bool("v", false, "Print wscreensavers version and exit")
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

	if *versionFlag || *shortVerFlag {
		fmt.Printf("wscreensavers v%s\n", version.Version)
		return
	}

	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		distFS = assets
	}

	// Overlay and daemon modes allow only one instance each, so a repeated hotkey
	// press or duplicate autostart entry does not stack processes.
	if *saverMode || *lockMode || *wallpaperMode || *daemonMode {
		lockName := "saver"
		switch {
		case *lockMode:
			lockName = "lock"
		case *wallpaperMode:
			lockName = "wallpaper"
		case *daemonMode:
			lockName = "daemon"
		}

		acquireFunc := singleton.Acquire
		if *wallpaperMode {
			acquireFunc = singleton.AcquireOrReplace
		}

		if _, err := acquireFunc(lockName, 3*time.Second); err != nil {
			if errors.Is(err, singleton.ErrAlreadyRunning) {
				log.Printf("wscreensavers --%s is already running; exiting", lockName)
				return
			}
			log.Fatalf("Failed to acquire instance lock: %v", err)
		}
	}

	srv := api.NewServer(cfgMgr, distFS)

	// Mode 1: Child or standalone Wayland Layer-Shell Overlay / Wallpaper
	if *saverMode || *lockMode || *wallpaperMode {
		daemonURL := *serverURLFlag
		baseURL := daemonURL
		if baseURL == "" || *saverMode || *lockMode {
			startedURL, err := srv.StartEmbeddedHTTP("127.0.0.1:0")
			if err != nil {
				log.Fatalf("Failed to start embedded asset server: %v", err)
			}
			baseURL = startedURL
		}
		defer srv.ShutdownEmbedded()

		// Overlays and wallpapers are stopped with SIGTERM; cleanly tear down
		// GTK layer-shell surfaces and unmap Wayland windows before process exit.
		var terminatedBySignal atomic.Bool
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		go func() {
			<-sigCh
			terminatedBySignal.Store(true)
			srv.ShutdownEmbedded()
			layershell.RequestQuit()
			time.Sleep(150 * time.Millisecond)
			os.Exit(0)
		}()

		// Temporarily disable any active background live wallpaper to free all GPU and compositor resources
		if *saverMode || *lockMode {
			if *lockMode {
				layershell.StopMatchingSaverOnlyProcesses()
			}
			_ = srv.SetDPMS(true)
			notifyDaemonSuspendWallpaper(daemonURL)
			layershell.StopMatchingWallpaperProcesses()
		}

		startedAt := time.Now()
		var stopSeatWake func()
		if *saverMode || *lockMode {
			stopSeatWake = idle.StartSeatWakeListener(func() {
				if *saverMode {
					if time.Since(startedAt) > 900*time.Millisecond {
						_ = srv.SetDPMS(true)
						layershell.RequestQuit()
					}
				} else if *lockMode {
					srv.RecordWake()
					go func() {
						_ = srv.SetDPMS(true)
						layershell.WakeAllWindows()
						time.Sleep(350 * time.Millisecond)
						layershell.WakeAllWindows()
					}()
				}
			})
		}

		urls := buildMonitorURLs(baseURL, cfgMgr, srv, *saverIDFlag, *wallpaperMode, *lockMode)
		layershell.RunLayerShellWindows(urls, *wallpaperMode, *lockMode)

		if stopSeatWake != nil {
			stopSeatWake()
		}
		if (*saverMode || *lockMode) && !terminatedBySignal.Load() {
			_ = srv.SetDPMS(true)
			notifyDaemonOverlayExited(daemonURL, cfgMgr.Get().WallpaperEnabled)
		}
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

	// Mode 3: Native Wails v3 Desktop Control Center
	app := NewApp(cfgMgr, srv)
	wailsApp := application.New(application.Options{
		Name:        "wscreensavers",
		Description: "WScreenSavers - Wayland Screensaver & Wallpaper Suite",
		Services: []application.Service{
			application.NewService(app),
		},
		Assets: application.AssetOptions{
			Handler: srv.Handler(),
		},
		Linux: application.LinuxOptions{
			ProgramName: "wscreensavers",
		},
	})
	app.SetApplication(wailsApp)
	wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "main",
		Title:            "WScreenSavers - Wayland Screensaver & Wallpaper Suite",
		Width:            1400,
		Height:           900,
		MinWidth:         1024,
		MinHeight:        680,
		BackgroundColour: application.NewRGBA(9, 11, 17, 255),
		URL:              "/?api=" + url.QueryEscape(baseURL),
	})
	err = wailsApp.Run()
	if err != nil {
		log.Fatalf("Error running Wails application: %v", err)
	}
}

func buildMonitorURLs(baseURL string, cfgMgr *config.Manager, srv *api.Server, explicitSaverID string, isWallpaper bool, isLocked bool) []string {
	cfg := cfgMgr.Get()
	monitors := display.DetectMonitors()
	if len(monitors) == 0 {
		monitors = []models.MonitorOutput{{ID: 0, Name: "default", Width: 1920, Height: 1080}}
	}

	var urls []string
	usedWallpaperSavers := make(map[string]bool)

	for idx, mon := range monitors {
		chosenSaver := explicitSaverID
		if isWallpaper {
			isPerMon := explicitSaverID == "per-monitor" || (explicitSaverID == "" && (cfg.WallpaperMode != "single" || len(cfg.WallpaperPerMonitor) > 0))
			if isPerMon {
				if assigned, ok := cfg.WallpaperPerMonitor[mon.Name]; ok && assigned != "" && assigned != "random" && !usedWallpaperSavers[assigned] {
					chosenSaver = assigned
				} else {
					chosenSaver = srv.PickUniqueRandomSaver(usedWallpaperSavers)
				}
				usedWallpaperSavers[chosenSaver] = true
			} else {
				if chosenSaver == "" || chosenSaver == "random" || chosenSaver == "per-monitor" {
					chosenSaver = cfg.WallpaperSaver
				}
				if chosenSaver == "" || chosenSaver == "random" {
					chosenSaver = srv.PickRandomSaver()
				}
				if chosenSaver == "" || chosenSaver == "random" {
					chosenSaver = "flurry"
				}
			}
		} else {
			if chosenSaver == "" || chosenSaver == "random" {
				switch cfg.MultiMonitorMode {
				case "per-monitor":
					if assigned, ok := cfg.PerMonitorSaver[mon.Name]; ok && assigned != "" {
						chosenSaver = assigned
					}
				case "independent":
					if cfg.Mode == "random" || cfg.Mode == "cycle" {
						chosenSaver = srv.PickRandomSaver()
					} else {
						chosenSaver = cfg.SelectedSaver
					}
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
			if chosenSaver == "" || chosenSaver == "random" {
				chosenSaver = cfg.SelectedSaver
			}
			if chosenSaver == "" || chosenSaver == "random" {
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

func resolveDaemonURL(daemonURL string) string {
	if daemonURL != "" {
		return daemonURL
	}
	return "http://127.0.0.1:8642"
}

func notifyDaemonSuspendWallpaper(daemonURL string) {
	client := &http.Client{Timeout: 350 * time.Millisecond}
	resp, err := client.Post(resolveDaemonURL(daemonURL)+"/api/action/suspend-wallpaper", "application/json", nil)
	if err == nil {
		_ = resp.Body.Close()
	}
}

func notifyDaemonOverlayExited(daemonURL string, wallpaperEnabled bool) {
	client := &http.Client{Timeout: 400 * time.Millisecond}
	resp, err := client.Post(resolveDaemonURL(daemonURL)+"/api/action/overlay-exited", "application/json", nil)
	if err == nil {
		_ = resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			return
		}
	}
	// Fallback if primary daemon is not running: spawn --wallpaper directly if enabled
	if !wallpaperEnabled {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	cmd := exec.Command(exe, "--wallpaper")
	cmd.Env = os.Environ()
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if err := cmd.Start(); err == nil && cmd.Process != nil {
		_ = syscall.Setpriority(syscall.PRIO_PROCESS, cmd.Process.Pid, 19)
	}
}
