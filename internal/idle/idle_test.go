package idle

import (
	"testing"
	"time"
)

func TestIdleMonitorAndTelemetry(t *testing.T) {
	mon := NewMonitor()
	defer mon.Close()

	mon.RecordActivity()
	mon.SetScreensaverActive(true, true)

	st := mon.Status(true, true)
	if !st.Running || !st.ScreensaverActive || !st.Locked {
		t.Errorf("unexpected daemon status: %+v", st)
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

	// Active status
	st := mon.Status(false, false)
	if st.IdleSeconds > 2 {
		t.Errorf("expected small idle seconds while active, got %d", st.IdleSeconds)
	}

	// Simulated idled state
	mon.mu.Lock()
	mon.waylandIdle = true
	mon.idleStartedAt = time.Now().Add(-120 * time.Second)
	mon.mu.Unlock()

	stIdle := mon.Status(false, false)
	if stIdle.IdleSeconds < 119 || stIdle.IdleSeconds > 122 {
		t.Errorf("expected ~120 idle seconds, got %d", stIdle.IdleSeconds)
	}

	// User activity resumes
	mon.RecordActivity()
	stResumed := mon.Status(false, false)
	if stResumed.IdleSeconds > 2 {
		t.Errorf("expected idle seconds reset to ~0 after RecordActivity, got %d", stResumed.IdleSeconds)
	}
}

func TestAudioPlayingCheck(t *testing.T) {
	mon := NewMonitor()
	defer mon.Close()

	// Should not crash and should return boolean
	_ = mon.IsAudioPlaying()
}
