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

func TestSetMonitorsDPMSBackends(t *testing.T) {
	tmpBin := t.TempDir()
	logFile := filepath.Join(tmpBin, "dpms.log")

	makeStub := func(name string) {
		script := "#!/bin/sh\nprintf '%s %s\\n' \"" + name + "\" \"$*\" >> \"" + logFile + "\"\nexit 0\n"
		if err := os.WriteFile(filepath.Join(tmpBin, name), []byte(script), 0755); err != nil {
			t.Fatal(err)
		}
	}
	for _, bin := range []string{"hyprctl", "niri", "swaymsg", "wlopm", "xset", "wlr-randr"} {
		makeStub(bin)
	}

	origPath := os.Getenv("PATH")
	origHypr := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE")
	origNiri := os.Getenv("NIRI_SOCKET")
	origSway := os.Getenv("SWAYSOCK")
	origWayland := os.Getenv("WAYLAND_DISPLAY")
	origDisplay := os.Getenv("DISPLAY")
	origTestExec := os.Getenv("WSCREENSAVERS_TEST_EXEC_DPMS")
	origDisable := os.Getenv("WSCREENSAVERS_DISABLE_HW_DPMS")
	defer func() {
		_ = os.Setenv("PATH", origPath)
		_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", origHypr)
		_ = os.Setenv("NIRI_SOCKET", origNiri)
		_ = os.Setenv("SWAYSOCK", origSway)
		_ = os.Setenv("WAYLAND_DISPLAY", origWayland)
		_ = os.Setenv("DISPLAY", origDisplay)
		_ = os.Setenv("WSCREENSAVERS_TEST_EXEC_DPMS", origTestExec)
		_ = os.Setenv("WSCREENSAVERS_DISABLE_HW_DPMS", origDisable)
	}()

	_ = os.Setenv("PATH", tmpBin)
	_ = os.Setenv("WSCREENSAVERS_TEST_EXEC_DPMS", "1")
	_ = os.Unsetenv("WSCREENSAVERS_DISABLE_HW_DPMS")

	// 1. Hyprland session
	_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", "hypr-sig")
	_ = os.Setenv("WAYLAND_DISPLAY", "wayland-1")
	_ = os.Unsetenv("NIRI_SOCKET")
	_ = os.Unsetenv("SWAYSOCK")
	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("Hyprland DPMS off failed: %v", err)
	}
	if err := SetMonitorsDPMS(true); err != nil {
		t.Fatalf("Hyprland DPMS on failed: %v", err)
	}

	// 2. Niri session
	_ = os.Unsetenv("HYPRLAND_INSTANCE_SIGNATURE")
	_ = os.Setenv("NIRI_SOCKET", "/tmp/niri.sock")
	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("Niri DPMS off failed: %v", err)
	}
	if err := SetMonitorsDPMS(true); err != nil {
		t.Fatalf("Niri DPMS on failed: %v", err)
	}

	// 3. Sway session
	_ = os.Unsetenv("NIRI_SOCKET")
	_ = os.Setenv("SWAYSOCK", "/tmp/sway.sock")
	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("Sway DPMS off failed: %v", err)
	}
	if err := SetMonitorsDPMS(true); err != nil {
		t.Fatalf("Sway DPMS on failed: %v", err)
	}

	// 4. Generic Wayland session via wlopm
	_ = os.Unsetenv("SWAYSOCK")
	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("wlopm DPMS off failed: %v", err)
	}
	if err := SetMonitorsDPMS(true); err != nil {
		t.Fatalf("wlopm DPMS on failed: %v", err)
	}

	// 5. X11 fallback via xset
	_ = os.Unsetenv("WAYLAND_DISPLAY")
	_ = os.Setenv("DISPLAY", ":0")
	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("xset DPMS off failed: %v", err)
	}
	if err := SetMonitorsDPMS(true); err != nil {
		t.Fatalf("xset DPMS on failed: %v", err)
	}

	// 6. Disabled env guard
	_ = os.Setenv("WSCREENSAVERS_DISABLE_HW_DPMS", "1")
	_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", "hypr-sig")
	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("disabled DPMS guard failed: %v", err)
	}

	raw, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatalf("expected dpms.log to be written: %v", err)
	}
	got := string(raw)
	for _, want := range []string{
		"hyprctl dispatch dpms off",
		"hyprctl dispatch dpms on",
		"niri msg action power-off-monitors",
		"niri msg action power-on-monitors",
		"swaymsg output * power off",
		"swaymsg output * power on",
		"wlopm --off *",
		"wlopm --on *",
		"xset dpms force off",
		"xset dpms force on",
	} {
		if !containsLine(got, want) {
			t.Errorf("missing expected DPMS command %q in log:\n%s", want, got)
		}
	}
	if containsLine(got, "wlr-randr") {
		t.Errorf("wlr-randr must never be invoked for DPMS blanking:\n%s", got)
	}
}

func TestSetMonitorsDPMSHyprlandLuaFallbackAndOutputValidation(t *testing.T) {
	tmpBin := t.TempDir()
	logFile := filepath.Join(tmpBin, "dpms-lua.log")

	// Simulate Hyprland 0.57+ Lua config where `hyprctl dispatch dpms off` exits 7
	// and `hyprctl eval 'hl.dispatch(hl.dsp.dpms({ action = "off" }))'` succeeds with "ok".
	hyprLuaScript := `#!/bin/sh
printf 'hyprctl %s\n' "$*" >> "` + logFile + `"
if [ "$1" = "dispatch" ]; then
  printf '%s\n' "error: 3 [string \"return hl.dispatch(dpms $3)\"]:1: ')' expected near '$3'"
  exit 7
fi
if [ "$1" = "eval" ]; then
  printf 'ok\n'
  exit 0
fi
exit 1
`
	if err := os.WriteFile(filepath.Join(tmpBin, "hyprctl"), []byte(hyprLuaScript), 0755); err != nil {
		t.Fatal(err)
	}

	origPath := os.Getenv("PATH")
	origHypr := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE")
	origWayland := os.Getenv("WAYLAND_DISPLAY")
	origNiri := os.Getenv("NIRI_SOCKET")
	origTestExec := os.Getenv("WSCREENSAVERS_TEST_EXEC_DPMS")
	origDisable := os.Getenv("WSCREENSAVERS_DISABLE_HW_DPMS")
	defer func() {
		_ = os.Setenv("PATH", origPath)
		_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", origHypr)
		_ = os.Setenv("WAYLAND_DISPLAY", origWayland)
		_ = os.Setenv("NIRI_SOCKET", origNiri)
		_ = os.Setenv("WSCREENSAVERS_TEST_EXEC_DPMS", origTestExec)
		_ = os.Setenv("WSCREENSAVERS_DISABLE_HW_DPMS", origDisable)
	}()

	_ = os.Setenv("PATH", tmpBin)
	_ = os.Setenv("WSCREENSAVERS_TEST_EXEC_DPMS", "1")
	_ = os.Unsetenv("WSCREENSAVERS_DISABLE_HW_DPMS")
	_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", "hypr-057-lua")
	_ = os.Setenv("WAYLAND_DISPLAY", "wayland-1")
	_ = os.Unsetenv("NIRI_SOCKET")

	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("expected Hyprland 0.57 Lua eval fallback to succeed for off, got: %v", err)
	}
	if err := SetMonitorsDPMS(true); err != nil {
		t.Fatalf("expected Hyprland 0.57 Lua eval fallback to succeed for on, got: %v", err)
	}

	raw, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatal(err)
	}
	got := string(raw)
	for _, want := range []string{
		"hyprctl dispatch dpms off",
		`hyprctl eval hl.dispatch(hl.dsp.dpms({ action = "off" }))`,
		"hyprctl dispatch dpms on",
		`hyprctl eval hl.dispatch(hl.dsp.dpms({ action = "on" }))`,
	} {
		if !containsLine(got, want) {
			t.Errorf("missing expected Hyprland Lua fallback command %q in:\n%s", want, got)
		}
	}

	// Simulate hyprctl installed on a non-Hyprland Wayland desktop where hyprctl exits 0
	// with "HYPRLAND_INSTANCE_SIGNATURE not set!" — must treat as failure and fall through to niri.
	hyprNoSigScript := `#!/bin/sh
printf 'HYPRLAND_INSTANCE_SIGNATURE not set! (is hyprland running?)\n'
exit 0
`
	niriScript := `#!/bin/sh
printf 'niri %s\n' "$*" >> "` + logFile + `"
exit 0
`
	if err := os.WriteFile(filepath.Join(tmpBin, "hyprctl"), []byte(hyprNoSigScript), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpBin, "niri"), []byte(niriScript), 0755); err != nil {
		t.Fatal(err)
	}
	_ = os.Unsetenv("HYPRLAND_INSTANCE_SIGNATURE")
	if err := SetMonitorsDPMS(false); err != nil {
		t.Fatalf("expected fallback to niri when hyprctl reports signature not set: %v", err)
	}
	raw2, _ := os.ReadFile(logFile)
	if !containsLine(string(raw2), "niri msg action power-off-monitors") {
		t.Errorf("expected niri fallback when hyprctl exits 0 with error message, got:\n%s", string(raw2))
	}
}

func TestEnsureWaylandSessionEnvDiscovery(t *testing.T) {
	rtDir := t.TempDir()
	// Create mock sockets and lock files
	if err := os.WriteFile(filepath.Join(rtDir, "wayland-1"), []byte(""), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(rtDir, "wayland-1.lock"), []byte(""), 0600); err != nil {
		t.Fatal(err)
	}
	hyprDir := filepath.Join(rtDir, "hypr", "sig_live_123")
	if err := os.MkdirAll(hyprDir, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(hyprDir, ".socket.sock"), []byte(""), 0600); err != nil {
		t.Fatal(err)
	}
	swaySock := filepath.Join(rtDir, "sway-ipc.1000.99.sock")
	if err := os.WriteFile(swaySock, []byte(""), 0600); err != nil {
		t.Fatal(err)
	}
	niriSock := filepath.Join(rtDir, "niri.wayland-1.88.sock")
	if err := os.WriteFile(niriSock, []byte(""), 0600); err != nil {
		t.Fatal(err)
	}

	origWayland := os.Getenv("WAYLAND_DISPLAY")
	origSessionType := os.Getenv("XDG_SESSION_TYPE")
	origHypr := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE")
	origSway := os.Getenv("SWAYSOCK")
	origNiri := os.Getenv("NIRI_SOCKET")
	defer func() {
		sessionRuntimeDirOverride = ""
		_ = os.Setenv("WAYLAND_DISPLAY", origWayland)
		_ = os.Setenv("XDG_SESSION_TYPE", origSessionType)
		_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", origHypr)
		_ = os.Setenv("SWAYSOCK", origSway)
		_ = os.Setenv("NIRI_SOCKET", origNiri)
	}()

	sessionRuntimeDirOverride = rtDir
	_ = os.Unsetenv("WAYLAND_DISPLAY")
	_ = os.Unsetenv("XDG_SESSION_TYPE")
	_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", "stale_deleted_sig")
	_ = os.Unsetenv("SWAYSOCK")
	_ = os.Unsetenv("NIRI_SOCKET")

	EnsureWaylandSessionEnv()

	if got := os.Getenv("WAYLAND_DISPLAY"); got != "wayland-1" {
		t.Errorf("expected WAYLAND_DISPLAY=wayland-1, got %q", got)
	}
	if got := os.Getenv("XDG_SESSION_TYPE"); got != "wayland" {
		t.Errorf("expected XDG_SESSION_TYPE=wayland, got %q", got)
	}
	if got := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE"); got != "sig_live_123" {
		t.Errorf("expected HYPRLAND_INSTANCE_SIGNATURE=sig_live_123, got %q", got)
	}
	if got := os.Getenv("SWAYSOCK"); got != swaySock {
		t.Errorf("expected SWAYSOCK=%q, got %q", swaySock, got)
	}
	if got := os.Getenv("NIRI_SOCKET"); got != niriSock {
		t.Errorf("expected NIRI_SOCKET=%q, got %q", niriSock, got)
	}
}

func containsLine(logText, target string) bool {
	for _, line := range filepath.SplitList(logText) {
		_ = line
	}
	return len(logText) >= len(target) && (logText == target || containsSubstr(logText, target))
}

func containsSubstr(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
