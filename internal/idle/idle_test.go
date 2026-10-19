package idle

import "testing"

func TestIdleMonitorAndTelemetry(t *testing.T) {
	mon := NewMonitor()
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
