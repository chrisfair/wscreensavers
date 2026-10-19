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

	// 1. Test status
	if err := Run(cfgMgr, []string{"status"}); err != nil {
		t.Fatalf("expected status to succeed, got: %v", err)
	}

	// 2. Test set commands
	cases := [][]string{
		{"set", "mode", "single"},
		{"set", "selectedSaver", "boing"},
		{"set", "multiMonitorMode", "clone"},
		{"set", "idleTimeoutMinutes", "20"},
		{"set", "cycleTimeoutMinutes", "10"},
		{"set", "lockEnabled", "false"},
		{"set", "lockProvider", "hyprlock"},
		{"set", "showClockOnSaver", "false"},
		{"set", "inhibitOnAudio", "false"},
		{"set", "inhibitOnFullscreen", "false"},
		{"set", "wallpaperSaver", "glmatrix"},
		{"set", "wallpaperFpsCap", "45"},
	}

	for _, args := range cases {
		if err := Run(cfgMgr, args); err != nil {
			t.Errorf("expected ctl %v to succeed, got: %v", args, err)
		}
	}

	cfg := cfgMgr.Get()
	if cfg.SelectedSaver != "boing" || cfg.IdleTimeoutMinutes != 20 || cfg.WallpaperFPSCap != 45 {
		t.Errorf("unexpected updated config values: %+v", cfg)
	}

	// 3. Test randomize (without launch)
	if err := Run(cfgMgr, []string{"randomize"}); err != nil {
		t.Errorf("expected randomize to succeed, got: %v", err)
	}

	// 4. Test invalid key/command error handling
	if err := Run(cfgMgr, []string{"set", "invalidKey", "123"}); err == nil {
		t.Errorf("expected error on invalid set key")
	}
	if err := Run(cfgMgr, []string{"unknownCommand"}); err == nil {
		t.Errorf("expected error on unknown ctl command")
	}
}
