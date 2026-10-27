package ctl

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"wscreensavers/internal/config"
)

func TestCtlCommands(t *testing.T) {
	tmpDir := t.TempDir()
	tmp := filepath.Join(tmpDir, "config.json")
	cfgMgr, err := config.NewManager(tmp)
	if err != nil {
		t.Fatalf("failed to create config manager: %v", err)
	}

	tmpBin := filepath.Join(tmpDir, "bin")
	_ = os.MkdirAll(tmpBin, 0755)
	fakeExe := filepath.Join(tmpBin, "fake-wscreensavers")
	_ = os.WriteFile(fakeExe, []byte("#!/bin/sh\nexit 0\n"), 0755)
	for _, cmd := range []string{"pgrep", "pkill", "hyprctl", "swaymsg", "wlr-randr"} {
		_ = os.WriteFile(filepath.Join(tmpBin, cmd), []byte("#!/bin/sh\nexit 1\n"), 0755)
	}
	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	origExe := executablePathFunc
	executablePathFunc = func() (string, error) { return fakeExe, nil }
	defer func() { executablePathFunc = origExe }()

	origDaemon := daemonBaseURL
	daemonBaseURL = "http://127.0.0.1:1"
	defer func() { daemonBaseURL = origDaemon }()

	if err := Run(cfgMgr, nil); err != nil {
		t.Fatalf("expected empty args status to succeed, got: %v", err)
	}
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

	actionCases := [][]string{
		{"randomize"},
		{"randomize", "launch"},
		{"launch"},
		{"launch", "glmatrix"},
		{"lock"},
		{"lock", "flurry"},
		{"stop"},
		{"unlock"},
		{"wallpaper", "on", "glmatrix"},
		{"wallpaper", "off"},
		{"wallpaper", "toggle"},
		{"wallpaper", "shuffle"},
		{"gui"},
		{"nag", "off"},
		{"nag", "status"},
	}
	for _, args := range actionCases {
		if err := Run(cfgMgr, args); err != nil {
			t.Errorf("expected ctl %v to succeed, got: %v", args, err)
		}
	}

	// Test with mock daemon HTTP server and simulated running wallpaper process
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()
	daemonBaseURL = srv.URL

	_ = os.WriteFile(filepath.Join(tmpBin, "pgrep"), []byte("#!/bin/sh\necho 999999\nexit 0\n"), 0755)
	daemonCases := [][]string{
		{"set", "saver", "starfield"},
		{"set", "wallpaperSaver", "random"},
		{"set", "wallpaperMode", "per-monitor"},
		{"set", "wallpaperMode", "single"},
		{"set", "wallpaperPerMonitor", "DP-1=sonar"},
		{"launch"},
		{"lock"},
		{"stop"},
		{"randomize", "launch"},
		{"wallpaper", "shuffle"},
		{"wallpaper", "on", "random"},
		{"wallpaper", "off"},
	}
	for _, args := range daemonCases {
		if err := Run(cfgMgr, args); err != nil {
			t.Errorf("expected daemon ctl %v to succeed, got: %v", args, err)
		}
	}

	// Test fallback when daemon returns non-200 while wallpaper process is reported running
	daemonBaseURL = "http://127.0.0.1:1"
	// Make pgrep return 1 on subsequent calls so stopMatchingProcesses finishes quickly
	_ = os.WriteFile(filepath.Join(tmpBin, "pgrep"), []byte("#!/bin/sh\nexit 1\n"), 0755)

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
