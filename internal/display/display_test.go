package display

import (
	"os"
	"path/filepath"
	"testing"
)

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

func TestDetectMonitorsWlrRandrAndFallback(t *testing.T) {
	tmpBin := t.TempDir()
	origPath := os.Getenv("PATH")
	defer func() { _ = os.Setenv("PATH", origPath) }()

	// 1. Test fallback when neither hyprctl nor wlr-randr is in PATH
	_ = os.Setenv("PATH", tmpBin)
	fallback := DetectMonitors()
	if len(fallback) != 1 || fallback[0].Name != "DP-1" {
		t.Fatalf("expected fallback monitor DP-1, got %+v", fallback)
	}

	// 2. Test xrandr output parsing when wlr-randr is not present
	xrandrScript := filepath.Join(tmpBin, "xrandr")
	xrandrOut := `#!/bin/sh
printf '%s\n' "Screen 0: minimum 320 x 200, current 1440 x 900, maximum 16384 x 16384"
printf '%s\n' "HDMI-1 disconnected (normal left inverted right x axis y axis)"
printf '%s\n' "HDMI-2 connected primary 1440x900+0+0 (normal left inverted right x axis y axis) 1872mm x 1053mm"
printf '%s\n' "   1440x900      59.90*"
`
	if err := os.WriteFile(xrandrScript, []byte(xrandrOut), 0755); err != nil {
		t.Fatal(err)
	}
	xrandrMons := DetectMonitors()
	if len(xrandrMons) != 1 || xrandrMons[0].Name != "HDMI-2" || xrandrMons[0].Width != 1440 || xrandrMons[0].Height != 900 {
		t.Fatalf("expected 1 xrandr monitor HDMI-2 1440x900, got %+v", xrandrMons)
	}

	// 3. Test wlr-randr JSON parsing
	wlrScript := filepath.Join(tmpBin, "wlr-randr")
	wlrJSON := `#!/bin/sh
printf '%s\n' '[{"name":"HDMI-A-1","description":"Test Display 1","make":"AOC","model":"Q32","enabled":true,"position":{"x":0,"y":0},"scale":1.0,"modes":[{"width":1920,"height":1080,"refresh":60.0,"current":false},{"width":2560,"height":1440,"refresh":144.0,"current":true}]},{"name":"DP-2","enabled":false}]'
`
	if err := os.WriteFile(wlrScript, []byte(wlrJSON), 0755); err != nil {
		t.Fatal(err)
	}
	wlrMons := DetectMonitors()
	if len(wlrMons) != 1 || wlrMons[0].Name != "HDMI-A-1" || wlrMons[0].Width != 2560 {
		t.Fatalf("expected 1 enabled wlr-randr monitor 2560x1440, got %+v", wlrMons)
	}
}
