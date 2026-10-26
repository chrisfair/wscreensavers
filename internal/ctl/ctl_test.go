package ctl

import (
	"path/filepath"
	"testing"
	"wscreensavers/internal/config"
)

func TestCtlCommands(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "config.json")
	cfgMgr, err := config.NewManager(tmp)
	if err != nil {
		t.Fatalf("failed to create config manager: %v", err)
	}

	// 1. Test status, version & get
	if err := Run(cfgMgr, []string{"status"}); err != nil {
		t.Fatalf("expected status to succeed, got: %v", err)
	}
	for _, vArg := range []string{"version", "--version", "-v"} {
		if err := Run(cfgMgr, []string{vArg}); err != nil {
			t.Fatalf("expected %s to succeed, got: %v", vArg, err)
		}
	}
	if err := Run(cfgMgr, []string{"get"}); err != nil {
		t.Fatalf("expected get to succeed, got: %v", err)
	}

	// 2. Test set commands
	cases := [][]string{
		{"set", "mode", "single"},
		{"set", "selectedSaver", "boing"},
		{"set", "saver", "flurry"},
		{"set", "multiMonitorMode", "clone"},
		{"set", "idleTimeoutMinutes", "20"},
		{"set", "cycleTimeoutMinutes", "10"},
		{"set", "lockEnabled", "false"},
		{"set", "lockProvider", "hyprlock"},
		{"set", "showClockOnSaver", "false"},
		{"set", "inhibitOnAudio", "false"},
		{"set", "inhibitOnFullscreen", "false"},
		{"set", "wallpaperSaver", "glmatrix"},
		{"set", "wallpaperMode", "per-monitor"},
		{"set", "wallpaperMode", "single"},
		{"set", "wallpaperPerMonitor", "DP-1=flurry"},
		{"set", "wallpaperFpsCap", "45"},
		{"set", "xssMaxStreamDim", "1280"},
		{"set", "dpmsOffMinutes", "15"},
	}

	for _, args := range cases {
		if err := Run(cfgMgr, args); err != nil {
			t.Errorf("expected ctl %v to succeed, got: %v", args, err)
		}
	}

	cfg := cfgMgr.Get()
	if cfg.SelectedSaver != "flurry" || cfg.IdleTimeoutMinutes != 20 || cfg.WallpaperFPSCap != 45 || cfg.XSSMaxStreamDim != 1280 || cfg.DPMSOffMinutes != 15 {
		t.Errorf("unexpected updated config values: %+v", cfg)
	}

	// 3. Test pool commands
	poolCases := [][]string{
		{"pool", "toggle", "glmatrix"},
		{"pool", "toggle", "glmatrix"},
		{"pool", "none"},
		{"pool", "all"},
	}
	for _, args := range poolCases {
		if err := Run(cfgMgr, args); err != nil {
			t.Errorf("expected ctl %v to succeed, got: %v", args, err)
		}
	}

	// 4. Test randomize (without launch)
	if err := Run(cfgMgr, []string{"randomize"}); err != nil {
		t.Errorf("expected randomize to succeed, got: %v", err)
	}

	// 5. Test nag disable & status
	if err := Run(cfgMgr, []string{"nag", "off"}); err != nil {
		t.Errorf("expected nag off to succeed, got: %v", err)
	}
	if err := Run(cfgMgr, []string{"nag", "status"}); err != nil {
		t.Errorf("expected nag status to succeed, got: %v", err)
	}

	// 6. Test invalid key/command error handling
	errCases := [][]string{
		{"set"},
		{"set", "onlyOneArg"},
		{"set", "invalidKey", "123"},
		{"pool"},
		{"pool", "toggle"},
		{"pool", "unknownAction"},
		{"nag", "invalidSub"},
		{"unknownCommand"},
	}
	for _, args := range errCases {
		if err := Run(cfgMgr, args); err == nil {
			t.Errorf("expected error for ctl %v", args)
		}
	}
}
