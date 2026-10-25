package layershell

import "testing"

func TestProcessControllerLifecycle(t *testing.T) {
	exited := false
	ctrl := NewProcessController(func() {
		exited = true
	})
	if ctrl == nil {
		t.Fatal("expected non-nil ProcessController")
	}

	// Empty URLs should return immediately without starting GTK
	RunLayerShellWindows(nil, false, false)
	RequestQuit()
	WakeAllWindows()

	// Stop calls when no child process is active must be safe no-ops
	ctrl.StopSaverOverlay()
	ctrl.StopWallpaper()
	ctrl.StopAll()
	StopMatchingWallpaperProcesses()

	_ = ctrl.IsSaverRunning()
	if exited {
		t.Errorf("onSaverExit should not fire when no process was started")
	}
}
