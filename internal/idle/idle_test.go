package idle

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestIdleMonitorAndTelemetry(t *testing.T) {
	tmpDir := t.TempDir()
	tmpBin := filepath.Join(tmpDir, "bin")
	_ = os.MkdirAll(tmpBin, 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "pactl"), []byte("#!/bin/sh\necho 'Corked: no'\nexit 0\n"), 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "hyprctl"), []byte("#!/bin/sh\nif [ \"$1\" = \"cursorpos\" ]; then echo '120, 340'; else echo '{\"fullscreen\":1,\"class\":\"mpv\"}'; fi\nexit 0\n"), 0755)
	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	mon := NewMonitor()
	defer mon.Close()

	resumed := false
	mon.OnResume(nil)
	mon.OnResume(func() {
		resumed = true
	})

	mon.RecordActivity()
	if !resumed {
		t.Errorf("expected OnResume callback to fire on RecordActivity")
	}

	stopWake := StartSeatWakeListener(func() {})
	stopWake()

	mon.SetScreensaverActive(true, true)

	st := mon.Status(true, true)
	if !st.Running || !st.ScreensaverActive || !st.Locked || !st.Inhibited {
		t.Errorf("unexpected daemon status: %+v", st)
	}

	mon.PollCursorActivity()
	_ = os.WriteFile(filepath.Join(tmpBin, "hyprctl"), []byte("#!/bin/sh\nif [ \"$1\" = \"cursorpos\" ]; then echo '200, 400'; else echo '{\"fullscreen\":1,\"class\":\"wscreensavers\"}'; fi\nexit 0\n"), 0755)
	mon.PollCursorActivity()
	if mon.IsFullscreenAppActive() {
		t.Errorf("expected wscreensavers window class to not count as external fullscreen app")
	}

	mon.SetWallpaperActive(true)
	mon.SetScreensaverActive(false, false)
	st2 := mon.Status(false, false)
	if !st2.WallpaperActive || st2.ScreensaverActive {
		t.Errorf("unexpected updated status: %+v", st2)
	}

	blips := ScanSystemBlips()
	if len(blips) == 0 {
		t.Errorf("expected non-empty system blips from /proc")
	}

	feed := SystemTelemetryFeed()
	if len(feed) < 2 {
		t.Errorf("expected telemetry feed lines, got %d", len(feed))
	}
}

func TestWaylandIdleCalculation(t *testing.T) {
	mon := &Monitor{
		waylandActive: true,
		lastActivity:  time.Now(),
	}

	st := mon.Status(false, false)
	if st.IdleSeconds > 2 {
		t.Errorf("expected small idle seconds while active, got %d", st.IdleSeconds)
	}

	mon.mu.Lock()
	mon.waylandIdle = true
	mon.idleStartedAt = time.Now().Add(-120 * time.Second)
	mon.mu.Unlock()

	stIdle := mon.Status(false, false)
	if stIdle.IdleSeconds < 119 || stIdle.IdleSeconds > 122 {
		t.Errorf("expected ~120 idle seconds, got %d", stIdle.IdleSeconds)
	}

	mon.RecordActivity()
	stResumed := mon.Status(false, false)
	if stResumed.IdleSeconds > 2 {
		t.Errorf("expected idle seconds reset to ~0 after RecordActivity, got %d", stResumed.IdleSeconds)
	}
}

func TestAudioPlayingFallback(t *testing.T) {
	tmpDir := t.TempDir()
	tmpBin := filepath.Join(tmpDir, "bin")
	_ = os.MkdirAll(tmpBin, 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "pactl"), []byte("#!/bin/sh\nexit 1\n"), 0755)
	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	mon := NewMonitor()
	defer mon.Close()

	_ = mon.IsAudioPlaying()
}
