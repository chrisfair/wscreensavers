package display

import "testing"

func TestDetectMonitors(t *testing.T) {
	monitors := DetectMonitors()
	if len(monitors) == 0 {
		t.Fatal("expected at least 1 monitor from DetectMonitors()")
	}
	for _, m := range monitors {
		if m.Name == "" {
			t.Errorf("expected non-empty monitor Name, got %+v", m)
		}
		if m.Width <= 0 || m.Height <= 0 {
			t.Errorf("expected positive dimensions, got %dx%d", m.Width, m.Height)
		}
	}
}
