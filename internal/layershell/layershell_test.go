package layershell

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestProcessControllerLifecycle(t *testing.T) {
	tmpDir := t.TempDir()
	tmpBin := filepath.Join(tmpDir, "bin")
	_ = os.MkdirAll(tmpBin, 0755)

	fakeExe := filepath.Join(tmpBin, "fake-wscreensavers")
	_ = os.WriteFile(fakeExe, []byte("#!/bin/sh\nsleep 0.15\nexit 0\n"), 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "pgrep"), []byte("#!/bin/sh\nexit 1\n"), 0755)

	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	origExe := executablePathFunc
	executablePathFunc = func() (string, error) { return fakeExe, nil }
	defer func() { executablePathFunc = origExe }()

	exited := make(chan struct{}, 4)
	ctrl := NewProcessController(func() {
		select {
		case exited <- struct{}{}:
		default:
		}
	})
	if ctrl == nil {
		t.Fatal("expected non-nil ProcessController")
	}

	RunLayerShellWindows(nil, false, false)
	RequestQuit()
	WakeAllWindows()

	ctrl.stopSaverOnly()
	ctrl.StopSaverOverlay()
	ctrl.StopWallpaper()
	ctrl.StopAll()
	StopMatchingSaverOnlyProcesses()
	StopMatchingSaverProcesses()
	StopMatchingWallpaperProcesses()

	if ctrl.IsLockRunning() || ctrl.IsSaverRunning() {
		t.Errorf("expected no saver or lock running initially")
	}

	if err := ctrl.StartWallpaper("http://127.0.0.1:8642", "glmatrix"); err != nil {
		t.Fatalf("StartWallpaper failed: %v", err)
	}
	ctrl.StopWallpaper()

	if err := ctrl.StartSaverOverlay("http://127.0.0.1:8642", "flurry", false); err != nil {
		t.Fatalf("StartSaverOverlay failed: %v", err)
	}
	if !ctrl.IsSaverRunning() {
		t.Errorf("expected IsSaverRunning true while child saver process is alive")
	}
	// Starting wallpaper while saver is running should no-op
	if err := ctrl.StartWallpaper("http://127.0.0.1:8642", "glmatrix"); err != nil {
		t.Fatalf("StartWallpaper during saver failed: %v", err)
	}

	select {
	case <-exited:
	case <-time.After(2 * time.Second):
		t.Errorf("expected onSaverExit callback when child saver exited")
	}

	// Start locked overlay and stop it explicitly
	longExe := filepath.Join(tmpBin, "long-wscreensavers")
	_ = os.WriteFile(longExe, []byte("#!/bin/sh\nsleep 5\n"), 0755)
	executablePathFunc = func() (string, error) { return longExe, nil }

	if err := ctrl.StartSaverOverlay("http://127.0.0.1:8642", "glmatrix", true); err != nil {
		t.Fatalf("StartSaverOverlay locked failed: %v", err)
	}
	if !ctrl.IsLockRunning() {
		t.Errorf("expected IsLockRunning true while lock process is alive")
	}
	// Starting another saver while locked must no-op
	if err := ctrl.StartSaverOverlay("http://127.0.0.1:8642", "boing", false); err != nil {
		t.Fatalf("StartSaverOverlay while locked failed: %v", err)
	}
	ctrl.StopAll()
}
