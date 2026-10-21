package ctl

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"wscreensavers/internal/catalog"
	"wscreensavers/internal/config"
	"wscreensavers/internal/models"
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
	Config           models.AppConfig `json:"config"`
	SelectedName     string           `json:"selectedName"`
	WallpaperName    string           `json:"wallpaperName"`
	WallpaperRunning bool             `json:"wallpaperRunning"`
	Savers           []CompactSaver   `json:"savers"`
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
	out, err := exec.Command("pgrep", "-f", "wscreensavers.*--wallpaper").Output()
	return err == nil && len(strings.TrimSpace(string(out))) > 0
}

func stopWallpaperProcesses() {
	_ = exec.Command("pkill", "-f", "wscreensavers.*--wallpaper").Run()
}

func stopSaverProcesses() {
	_ = exec.Command("pkill", "-f", "wscreensavers.*--saver").Run()
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

	return StatusPayload{
		Config:           cfg,
		SelectedName:     selName,
		WallpaperName:    wpName,
		WallpaperRunning: isWallpaperProcessRunning(),
		Savers:           compact,
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
		return printStatus(cfgMgr)
	}

	sub := args[0]
	cfg := cfgMgr.Get()

	switch sub {
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
				stopWallpaperProcesses()
				_ = spawnDetached("--wallpaper", "--saver-id", val)
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
		saverID := cfg.SelectedSaver
		if len(args) >= 2 && args[1] != "" {
			saverID = args[1]
		}
		stopSaverProcesses()
		if err := spawnDetached("--saver", "--saver-id", saverID); err != nil {
			return err
		}
		return printStatus(cfgMgr)

	case "lock":
		saverID := cfg.SelectedSaver
		if len(args) >= 2 && args[1] != "" {
			saverID = args[1]
		}
		stopSaverProcesses()
		if err := spawnDetached("--lock", "--saver-id", saverID); err != nil {
			return err
		}
		return printStatus(cfgMgr)

	case "randomize":
		savers := allSavers()
		if len(savers) > 0 {
			picked := savers[rand.Intn(len(savers))].ID
			if len(cfg.EnabledSavers) > 0 {
				picked = cfg.EnabledSavers[rand.Intn(len(cfg.EnabledSavers))]
			}
			cfg.SelectedSaver = picked
			_ = cfgMgr.Update(cfg)
			if len(args) >= 2 && args[1] == "launch" {
				stopSaverProcesses()
				_ = spawnDetached("--saver", "--saver-id", picked)
			}
		}
		return printStatus(cfgMgr)

	case "wallpaper":
		action := "toggle"
		if len(args) >= 2 {
			action = args[1]
		}
		saverID := cfg.WallpaperSaver
		if saverID == "" {
			saverID = cfg.SelectedSaver
		}
		if len(args) >= 3 && args[2] != "" {
			saverID = args[2]
			cfg.WallpaperSaver = saverID
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

		stopWallpaperProcesses()
		cfg.WallpaperEnabled = shouldRun
		_ = cfgMgr.Update(cfg)

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

	default:
		return fmt.Errorf("unknown ctl command: %s", sub)
	}
}
