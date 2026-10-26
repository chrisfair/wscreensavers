package ctl

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"time"
	"wscreensavers/internal/catalog"
	"wscreensavers/internal/config"
	"wscreensavers/internal/display"
	"wscreensavers/internal/models"
	"wscreensavers/internal/shuffle"
	"wscreensavers/internal/support"
	"wscreensavers/internal/version"
	"wscreensavers/internal/xscreensaver"
)

type CompactSaver struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Engine      string `json:"engine"`
	AccentColor string `json:"accentColor"`
	Description string `json:"description"`
}

type StatusPayload struct {
	Version          string                 `json:"version"`
	Config           models.AppConfig       `json:"config"`
	SelectedName     string                 `json:"selectedName"`
	WallpaperName    string                 `json:"wallpaperName"`
	WallpaperRunning bool                   `json:"wallpaperRunning"`
	Savers           []CompactSaver         `json:"savers"`
	// OtherWallpapers names other wallpaper programs running under the live wallpaper.
	OtherWallpapers []string               `json:"otherWallpapers"`
	Monitors        []models.MonitorOutput `json:"monitors"`
}

func allSavers() []models.Screensaver {
	builtins := catalog.BuiltinScreensavers()
	nativeNames := make(map[string]bool)
	for _, b := range builtins {
		nativeNames[strings.ToLower(b.ID)] = true
		nativeNames[strings.ToLower(b.Name)] = true
	}
	ext := xscreensaver.DiscoverSystemXScreenSavers(nativeNames)
	return append(builtins, ext...)
}

func isWallpaperProcessRunning() bool {
	out, err := exec.Command("pgrep", "-f", "wscreensavers.*--wallpaper([[:space:]]|$)").Output()
	return err == nil && len(strings.TrimSpace(string(out))) > 0
}

func tryDaemonPost(endpoint string, reqBody any) bool {
	client := &http.Client{Timeout: 800 * time.Millisecond}
	data, err := json.Marshal(reqBody)
	if err != nil {
		return false
	}
	resp, err := client.Post("http://127.0.0.1:8642"+endpoint, "application/json", bytes.NewReader(data))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func stopMatchingProcesses(pattern string) {
	_ = exec.Command("pkill", "-f", pattern).Run()
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		out, err := exec.Command("pgrep", "-f", pattern).Output()
		if err != nil || len(strings.TrimSpace(string(out))) == 0 {
			return
		}
		time.Sleep(25 * time.Millisecond)
	}
	_ = exec.Command("pkill", "-9", "-f", pattern).Run()
	deadline = time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		out, err := exec.Command("pgrep", "-f", pattern).Output()
		if err != nil || len(strings.TrimSpace(string(out))) == 0 {
			return
		}
		time.Sleep(25 * time.Millisecond)
	}
}

func stopWallpaperProcesses() {
	stopMatchingProcesses("wscreensavers.*--wallpaper([[:space:]]|$)")
}

func stopSaverProcesses() {
	stopMatchingProcesses("wscreensavers.*--saver([[:space:]]|$)")
}

func stopLockProcesses() {
	stopMatchingProcesses("wscreensavers.*--lock([[:space:]]|$)")
}

func spawnDetached(args ...string) error {
	exe, err := os.Executable()
	if err != nil {
		exe = "wscreensavers"
	}
	cmd := exec.Command(exe, args...)
	cmd.Env = append(os.Environ(), "WEBKIT_DISABLE_DMABUF_RENDERER=1")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	devNull, err := os.OpenFile(os.DevNull, os.O_RDWR, 0)
	if err == nil {
		cmd.Stdin = devNull
		cmd.Stdout = devNull
		cmd.Stderr = devNull
		defer devNull.Close()
	}
	return cmd.Start()
}

func buildStatus(cfgMgr *config.Manager) StatusPayload {
	cfg := cfgMgr.Get()
	savers := allSavers()
	compact := make([]CompactSaver, 0, len(savers))
	selName := cfg.SelectedSaver
	wpName := cfg.WallpaperSaver

	for _, s := range savers {
		if s.ID == cfg.SelectedSaver {
			selName = s.Name
		}
		if s.ID == cfg.WallpaperSaver {
			wpName = s.Name
		}
		accent := s.AccentColor
		if accent == "" {
			accent = "#38bdf8"
		}
		compact = append(compact, CompactSaver{
			ID:          s.ID,
			Name:        s.Name,
			Category:    s.Category,
			Engine:      s.Engine,
			AccentColor: accent,
			Description: s.Description,
		})
	}

	if cfg.WallpaperMode == "per-monitor" {
		wpName = "Per-Monitor (Unique)"
	}

	return StatusPayload{
		Version:          version.Version,
		Config:           cfg,
		SelectedName:     selName,
		WallpaperName:    wpName,
		WallpaperRunning: isWallpaperProcessRunning(),
		Savers:           compact,
		OtherWallpapers:  display.OtherWallpaperPrograms(),
		Monitors:         display.DetectMonitors(),
	}
}

func printStatus(cfgMgr *config.Manager) error {
	payload := buildStatus(cfgMgr)
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	fmt.Println(string(data))
	return nil
}

// Run executes a CLI control subcommand for the Noctalia plugin or shell scripts.
func Run(cfgMgr *config.Manager, args []string) error {
	if len(args) == 0 || args[0] == "status" || args[0] == "get" {
		cfg := cfgMgr.Get()
		if cfg.WallpaperEnabled && !isWallpaperProcessRunning() {
			// Auto-persist on reboot/login: user enabled live wallpaper, but process is not running.
			saverID := cfg.WallpaperSaver
			if cfg.WallpaperMode == "per-monitor" {
				saverID = "per-monitor"
			} else {
				if saverID == "" {
					saverID = cfg.SelectedSaver
				}
				if saverID == "random" || saverID == "" {
					pool := cfg.EnabledSavers
					if len(pool) == 0 {
						for _, s := range allSavers() {
							pool = append(pool, s.ID)
						}
					}
					saverID = shuffle.Next(cfgMgr.ShufflePath(), pool)
				}
			}
			if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": saverID}) {
				if saverID == "per-monitor" {
					_ = spawnDetached("--wallpaper")
				} else {
					_ = spawnDetached("--wallpaper", "--saver-id", saverID)
				}
			}
		}
		return printStatus(cfgMgr)
	}

	sub := args[0]
	cfg := cfgMgr.Get()

	switch sub {
	case "version", "--version", "-v":
		fmt.Printf("wscreensavers v%s\n", version.Version)
		return nil

	case "set":
		if len(args) < 3 {
			return fmt.Errorf("usage: wscreensavers ctl set <key> <value>")
		}
		key := args[1]
		val := args[2]
		switch key {
		case "mode":
			cfg.Mode = val
		case "selectedSaver", "saver":
			cfg.SelectedSaver = val
			if cfg.WallpaperEnabled && isWallpaperProcessRunning() {
				cfg.WallpaperSaver = val
				if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": val}) {
					stopWallpaperProcesses()
					_ = spawnDetached("--wallpaper", "--saver-id", val)
				}
			}
		case "multiMonitorMode":
			cfg.MultiMonitorMode = val
		case "idleTimeoutMinutes":
			if n, err := strconv.Atoi(val); err == nil && n > 0 {
				cfg.IdleTimeoutMinutes = n
			}
		case "cycleTimeoutMinutes":
			if n, err := strconv.Atoi(val); err == nil && n > 0 {
				cfg.CycleTimeoutMinutes = n
			}
		case "lockEnabled":
			cfg.LockEnabled = val == "true" || val == "1" || val == "on"
		case "lockProvider":
			cfg.LockProvider = val
		case "showClockOnSaver":
			cfg.ShowClockOnSaver = val == "true" || val == "1" || val == "on"
		case "inhibitOnAudio":
			cfg.InhibitOnAudio = val == "true" || val == "1" || val == "on"
		case "inhibitOnFullscreen":
			cfg.InhibitOnFullscreen = val == "true" || val == "1" || val == "on"
		case "wallpaperSaver":
			cfg.WallpaperSaver = val
			if isWallpaperProcessRunning() {
				actualSaver := val
				if actualSaver == "random" {
					pool := cfg.EnabledSavers
					if len(pool) == 0 {
						for _, s := range allSavers() {
							pool = append(pool, s.ID)
						}
					}
					actualSaver = shuffle.Next(cfgMgr.ShufflePath(), pool)
				}
				if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": actualSaver}) {
					stopWallpaperProcesses()
					_ = spawnDetached("--wallpaper", "--saver-id", actualSaver)
				}
			}
		case "wallpaperMode":
			cfg.WallpaperMode = val
			if isWallpaperProcessRunning() {
				if cfg.WallpaperMode == "per-monitor" {
					if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": "per-monitor"}) {
						stopWallpaperProcesses()
						_ = spawnDetached("--wallpaper")
					}
				} else {
					if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": cfg.WallpaperSaver}) {
						stopWallpaperProcesses()
						_ = spawnDetached("--wallpaper", "--saver-id", cfg.WallpaperSaver)
					}
				}
			}
		case "wallpaperPerMonitor":
			parts := strings.SplitN(val, "=", 2)
			if len(parts) == 2 {
				mon := strings.TrimSpace(parts[0])
				sav := strings.TrimSpace(parts[1])
				if cfg.WallpaperPerMonitor == nil {
					cfg.WallpaperPerMonitor = make(map[string]string)
				}
				cfg.WallpaperPerMonitor[mon] = sav
				cfg.WallpaperPerMonitor = config.SanitizeWallpaperPerMonitor(cfg.WallpaperPerMonitor)
				cfg.WallpaperMode = "per-monitor"
				if isWallpaperProcessRunning() {
					if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": "per-monitor"}) {
						stopWallpaperProcesses()
						_ = spawnDetached("--wallpaper")
					}
				}
			}
		case "wallpaperFpsCap":
			if n, err := strconv.Atoi(val); err == nil && n >= 5 {
				cfg.WallpaperFPSCap = n
			}
		case "xssMaxStreamDim":
			if n, err := strconv.Atoi(val); err == nil && n >= 320 && n <= 3840 {
				cfg.XSSMaxStreamDim = n
			}
		case "dpmsOffMinutes":
			if n, err := strconv.Atoi(val); err == nil && n >= 0 {
				cfg.DPMSOffMinutes = n
			}
		default:
			return fmt.Errorf("unknown config key: %s", key)
		}
		if err := cfgMgr.Update(cfg); err != nil {
			return err
		}
		return printStatus(cfgMgr)

	case "launch":
		saverID := ""
		if len(args) >= 2 && args[1] != "" {
			saverID = args[1]
		} else if cfg.Mode == "random" || cfg.Mode == "cycle" {
			pool := cfg.EnabledSavers
			if len(pool) == 0 {
				for _, s := range allSavers() {
					pool = append(pool, s.ID)
				}
			}
			saverID = shuffle.Next(cfgMgr.ShufflePath(), pool)
		}
		if saverID == "" {
			saverID = cfg.SelectedSaver
		}
		if tryDaemonPost("/api/action/launch-saver", map[string]any{"saverId": saverID, "locked": false}) {
			return printStatus(cfgMgr)
		}
		stopWallpaperProcesses()
		stopSaverProcesses()
		if err := spawnDetached("--saver", "--saver-id", saverID); err != nil {
			return err
		}
		return printStatus(cfgMgr)

	case "lock":
		saverID := ""
		if len(args) >= 2 && args[1] != "" {
			saverID = args[1]
		} else if cfg.Mode == "random" || cfg.Mode == "cycle" {
			pool := cfg.EnabledSavers
			if len(pool) == 0 {
				for _, s := range allSavers() {
					pool = append(pool, s.ID)
				}
			}
			saverID = shuffle.Next(cfgMgr.ShufflePath(), pool)
		}
		if saverID == "" {
			saverID = cfg.SelectedSaver
		}
		if tryDaemonPost("/api/action/lock", map[string]any{"saverId": saverID}) {
			return printStatus(cfgMgr)
		}
		stopWallpaperProcesses()
		stopLockProcesses()
		stopSaverProcesses()
		if err := spawnDetached("--lock", "--saver-id", saverID); err != nil {
			return err
		}
		return printStatus(cfgMgr)

	case "stop", "unlock":
		_ = tryDaemonPost("/api/action/stop-saver", map[string]any{})
		stopSaverProcesses()
		stopLockProcesses()
		if cfg.WallpaperEnabled && !isWallpaperProcessRunning() {
			if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": "per-monitor"}) {
				_ = spawnDetached("--wallpaper")
			}
		}
		return printStatus(cfgMgr)

	case "randomize":
		pool := cfg.EnabledSavers
		if len(pool) == 0 {
			for _, s := range allSavers() {
				pool = append(pool, s.ID)
			}
		}
		if picked := shuffle.Next(cfgMgr.ShufflePath(), pool); picked != "" {
			cfg.SelectedSaver = picked
			_ = cfgMgr.Update(cfg)
			if len(args) >= 2 && args[1] == "launch" {
				if !tryDaemonPost("/api/action/launch-saver", map[string]any{"saverId": picked, "locked": false}) {
					stopSaverProcesses()
					_ = spawnDetached("--saver", "--saver-id", picked)
				}
			}
		}
		return printStatus(cfgMgr)

	case "pool":
		// usage: pool toggle <id> | pool all | pool none
		if len(args) < 2 {
			return fmt.Errorf("usage: wscreensavers ctl pool <toggle <id>|all|none>")
		}
		switch args[1] {
		case "toggle":
			if len(args) < 3 || args[2] == "" {
				return fmt.Errorf("usage: wscreensavers ctl pool toggle <id>")
			}
			id := args[2]
			next := make([]string, 0, len(cfg.EnabledSavers)+1)
			found := false
			for _, e := range cfg.EnabledSavers {
				if e == id {
					found = true
					continue
				}
				next = append(next, e)
			}
			if !found {
				next = append(next, id)
			}
			cfg.EnabledSavers = next
		case "all":
			cfg.EnabledSavers = cfg.EnabledSavers[:0:0]
			for _, s := range allSavers() {
				cfg.EnabledSavers = append(cfg.EnabledSavers, s.ID)
			}
		case "none":
			cfg.EnabledSavers = []string{}
		default:
			return fmt.Errorf("unknown pool action: %s", args[1])
		}
		if err := cfgMgr.Update(cfg); err != nil {
			return err
		}
		return printStatus(cfgMgr)

	case "wallpaper":
		action := "toggle"
		if len(args) >= 2 {
			action = args[1]
		}

		if action == "shuffle" {
			mons := display.DetectMonitors()
			pool := cfg.EnabledSavers
			if len(pool) == 0 {
				for _, s := range allSavers() {
					pool = append(pool, s.ID)
				}
			}
			rPool := make([]string, len(pool))
			copy(rPool, pool)
			rand.Shuffle(len(rPool), func(i, j int) { rPool[i], rPool[j] = rPool[j], rPool[i] })
			if cfg.WallpaperPerMonitor == nil {
				cfg.WallpaperPerMonitor = make(map[string]string)
			}
			for i, m := range mons {
				cfg.WallpaperPerMonitor[m.Name] = rPool[i%len(rPool)]
			}
			cfg.WallpaperMode = "per-monitor"
			cfg.WallpaperEnabled = true
			if err := cfgMgr.Update(cfg); err != nil {
				return err
			}
			if !tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": true, "saverId": "per-monitor"}) {
				stopWallpaperProcesses()
				_ = spawnDetached("--wallpaper")
			}
			return printStatus(cfgMgr)
		}

		saverID := cfg.WallpaperSaver
		if saverID == "" {
			saverID = cfg.SelectedSaver
		}
		if len(args) >= 3 && args[2] != "" {
			saverID = args[2]
			cfg.WallpaperSaver = saverID
			cfg.SelectedSaver = saverID
		}

		running := isWallpaperProcessRunning()
		shouldRun := running
		switch action {
		case "on", "start", "true":
			shouldRun = true
		case "off", "stop", "false":
			shouldRun = false
		default:
			shouldRun = !running
		}

		cfg.WallpaperEnabled = shouldRun
		_ = cfgMgr.Update(cfg)

		if shouldRun && (saverID == "random" || saverID == "") {
			pool := cfg.EnabledSavers
			if len(pool) == 0 {
				for _, s := range allSavers() {
					pool = append(pool, s.ID)
				}
			}
			saverID = shuffle.Next(cfgMgr.ShufflePath(), pool)
		}

		if tryDaemonPost("/api/action/toggle-wallpaper", map[string]any{"enabled": shouldRun, "saverId": saverID}) {
			return printStatus(cfgMgr)
		}

		stopWallpaperProcesses()
		if shouldRun {
			if err := spawnDetached("--wallpaper", "--saver-id", saverID); err != nil {
				return err
			}
		}
		return printStatus(cfgMgr)

	case "gui":
		if err := spawnDetached(); err != nil {
			return err
		}
		return printStatus(cfgMgr)

	case "nag", "support":
		// usage: wscreensavers ctl nag <off|disable|status>
		suppMgr, err := support.NewManager("")
		if err != nil {
			return err
		}
		action := "off"
		if len(args) >= 2 {
			action = args[1]
		}
		switch action {
		case "off", "disable", "mute":
			_, err := suppMgr.RecordSupport("Community Supporter", "cli-disabled")
			if err != nil {
				return err
			}
			fmt.Println("Startup support reminder disabled permanently.")
			return nil
		case "status":
			st := suppMgr.GetStatus(nil, nil)
			data, _ := json.MarshalIndent(st, "", "  ")
			fmt.Println(string(data))
			return nil
		default:
			return fmt.Errorf("usage: wscreensavers ctl nag <off|disable|status>")
		}

	default:
		return fmt.Errorf("unknown ctl command: %s", sub)
	}
}
