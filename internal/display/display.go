package display

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"wscreensavers/internal/models"
)

type hyprMonitor struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Make        string  `json:"make"`
	Model       string  `json:"model"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	RefreshRate float64 `json:"refreshRate"`
	X           int     `json:"x"`
	Y           int     `json:"y"`
	Scale       float64 `json:"scale"`
	Focused     bool    `json:"focused"`
}

type wlrRandrOutput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Make        string `json:"make"`
	Model       string `json:"model"`
	Enabled     bool   `json:"enabled"`
	Position    struct {
		X int `json:"x"`
		Y int `json:"y"`
	} `json:"position"`
	Scale float64 `json:"scale"`
	Modes []struct {
		Width   int     `json:"width"`
		Height  int     `json:"height"`
		Refresh float64 `json:"refresh"`
		Current bool    `json:"current"`
	} `json:"modes"`
}

// DetectMonitors queries Wayland or X11 outputs (Hyprland, wlr-randr, xrandr, or fallback).
func DetectMonitors() []models.MonitorOutput {
	EnsureWaylandSessionEnv()
	if mons := detectHyprland(); len(mons) > 0 {
		return mons
	}
	if mons := detectWlrRandr(); len(mons) > 0 {
		return mons
	}
	if mons := detectXrandr(); len(mons) > 0 {
		return mons
	}
	return []models.MonitorOutput{
		{
			ID:          0,
			Name:        "DP-1",
			Description: "Primary Wayland Output",
			Make:        "Wayland",
			Model:       "Display",
			Width:       2560,
			Height:      1440,
			RefreshRate: 144.0,
			X:           0,
			Y:           0,
			Scale:       1.0,
			Focused:     true,
		},
	}
}

func detectHyprland() []models.MonitorOutput {
	out, err := exec.Command("hyprctl", "monitors", "-j").Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	var raw []hyprMonitor
	if err := json.Unmarshal(out, &raw); err != nil {
		return nil
	}
	var res []models.MonitorOutput
	for _, m := range raw {
		res = append(res, models.MonitorOutput{
			ID:          m.ID,
			Name:        m.Name,
			Description: strings.TrimSpace(m.Description),
			Make:        m.Make,
			Model:       m.Model,
			Width:       m.Width,
			Height:      m.Height,
			RefreshRate: m.RefreshRate,
			X:           m.X,
			Y:           m.Y,
			Scale:       m.Scale,
			Focused:     m.Focused,
		})
	}
	return res
}

func detectWlrRandr() []models.MonitorOutput {
	out, err := exec.Command("wlr-randr", "--json").Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	var raw []wlrRandrOutput
	if err := json.Unmarshal(out, &raw); err != nil {
		return nil
	}
	var res []models.MonitorOutput
	for idx, m := range raw {
		if !m.Enabled {
			continue
		}
		w, h := 1920, 1080
		ref := 60.0
		for _, mode := range m.Modes {
			if mode.Current {
				w = mode.Width
				h = mode.Height
				ref = mode.Refresh
				break
			}
		}
		res = append(res, models.MonitorOutput{
			ID:          idx,
			Name:        m.Name,
			Description: m.Description,
			Make:        m.Make,
			Model:       m.Model,
			Width:       w,
			Height:      h,
			RefreshRate: ref,
			X:           m.Position.X,
			Y:           m.Position.Y,
			Scale:       m.Scale,
			Focused:     idx == 0,
		})
	}
	return res
}

var xrandrLineRe = regexp.MustCompile(`^(\S+)\s+connected\s+(?:primary\s+)?(\d+)x(\d+)\+(\d+)\+(\d+)`)

func detectXrandr() []models.MonitorOutput {
	out, err := exec.Command("xrandr", "--query").Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	var res []models.MonitorOutput
	for _, line := range strings.Split(string(out), "\n") {
		matches := xrandrLineRe.FindStringSubmatch(line)
		if len(matches) == 6 {
			w, _ := strconv.Atoi(matches[2])
			h, _ := strconv.Atoi(matches[3])
			x, _ := strconv.Atoi(matches[4])
			y, _ := strconv.Atoi(matches[5])
			if w > 0 && h > 0 {
				idx := len(res)
				res = append(res, models.MonitorOutput{
					ID:          idx,
					Name:        matches[1],
					Description: matches[1] + " (X11 Output)",
					Make:        "X11",
					Model:       matches[1],
					Width:       w,
					Height:      h,
					RefreshRate: 60.0,
					X:           x,
					Y:           y,
					Scale:       1.0,
					Focused:     idx == 0 || strings.Contains(line, " primary "),
				})
			}
		}
	}
	return res
}

var (
	dpmsCommandRunner         = defaultDPMSCommandRunner
	sessionRuntimeDirOverride string
)

// EnsureWaylandSessionEnv populates WAYLAND_DISPLAY and compositor IPC environment
// variables (HYPRLAND_INSTANCE_SIGNATURE, SWAYSOCK, NIRI_SOCKET) from live sockets in
// XDG_RUNTIME_DIR when a background daemon started before the Wayland compositor or
// survived a compositor restart.
func EnsureWaylandSessionEnv() {
	runtimeDir := sessionRuntimeDirOverride
	if runtimeDir == "" {
		if flag.Lookup("test.v") != nil {
			return
		}
		runtimeDir = os.Getenv("XDG_RUNTIME_DIR")
		if runtimeDir == "" {
			runtimeDir = fmt.Sprintf("/run/user/%d", os.Getuid())
		}
	}
	if info, err := os.Stat(runtimeDir); err != nil || !info.IsDir() {
		return
	}

	if wd := os.Getenv("WAYLAND_DISPLAY"); wd == "" || !waylandSocketExists(runtimeDir, wd) {
		if sock := newestMatchingPath(filepath.Join(runtimeDir, "wayland-*"), func(p string) bool {
			base := filepath.Base(p)
			return !strings.HasSuffix(base, ".lock")
		}); sock != "" {
			_ = os.Setenv("WAYLAND_DISPLAY", filepath.Base(sock))
			if os.Getenv("XDG_SESSION_TYPE") == "" {
				_ = os.Setenv("XDG_SESSION_TYPE", "wayland")
			}
		}
	}

	if sig := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE"); sig == "" || !pathExists(filepath.Join(runtimeDir, "hypr", sig, ".socket.sock")) {
		if sock := newestMatchingPath(filepath.Join(runtimeDir, "hypr", "*", ".socket.sock"), nil); sock != "" {
			_ = os.Setenv("HYPRLAND_INSTANCE_SIGNATURE", filepath.Base(filepath.Dir(sock)))
		}
	}

	if sw := os.Getenv("SWAYSOCK"); sw == "" || !pathExists(sw) {
		if sock := newestMatchingPath(filepath.Join(runtimeDir, "sway-ipc.*.sock"), nil); sock != "" {
			_ = os.Setenv("SWAYSOCK", sock)
		}
	}

	if ns := os.Getenv("NIRI_SOCKET"); ns == "" || !pathExists(ns) {
		if sock := newestMatchingPath(filepath.Join(runtimeDir, "niri.*.sock"), nil); sock != "" {
			_ = os.Setenv("NIRI_SOCKET", sock)
		}
	}
}

func pathExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func waylandSocketExists(runtimeDir, wd string) bool {
	if filepath.IsAbs(wd) {
		return pathExists(wd)
	}
	return pathExists(filepath.Join(runtimeDir, wd))
}

func newestMatchingPath(pattern string, allow func(string) bool) string {
	matches, err := filepath.Glob(pattern)
	if err != nil || len(matches) == 0 {
		return ""
	}
	type candidate struct {
		path    string
		modTime time.Time
	}
	var valid []candidate
	for _, m := range matches {
		if allow != nil && !allow(m) {
			continue
		}
		st, err := os.Stat(m)
		if err != nil || st.IsDir() {
			continue
		}
		valid = append(valid, candidate{path: m, modTime: st.ModTime()})
	}
	if len(valid) == 0 {
		return ""
	}
	sort.Slice(valid, func(i, j int) bool {
		if valid[i].modTime.Equal(valid[j].modTime) {
			return valid[i].path < valid[j].path
		}
		return valid[i].modTime.After(valid[j].modTime)
	})
	return valid[0].path
}

func defaultDPMSCommandRunner(name string, args ...string) error {
	if os.Getenv("WSCREENSAVERS_DISABLE_HW_DPMS") == "1" {
		return nil
	}
	// Never toggle physical display backlights on the host during `go test`
	// unless a test explicitly opts in with isolated fake binaries in PATH.
	if flag.Lookup("test.v") != nil && os.Getenv("WSCREENSAVERS_TEST_EXEC_DPMS") != "1" {
		return nil
	}
	out, err := exec.Command(name, args...).CombinedOutput()
	trimmed := strings.TrimSpace(string(out))
	if err != nil {
		if trimmed != "" {
			return fmt.Errorf("%s %s: %w (%s)", name, strings.Join(args, " "), err, trimmed)
		}
		return err
	}
	if name == "hyprctl" && trimmed != "" && !strings.EqualFold(trimmed, "ok") {
		return fmt.Errorf("hyprctl %s failed: %s", strings.Join(args, " "), trimmed)
	}
	return nil
}

func runHyprlandDPMS(onOff string) error {
	if err := dpmsCommandRunner("hyprctl", "dispatch", "dpms", onOff); err == nil {
		return nil
	}
	// Hyprland 0.57+ with Lua configuration evaluates `hyprctl dispatch` as `hl.dispatch(...)`,
	// where `dpms off` is a syntax error and `hl.dispatch(hl.dsp.dpms("off"|"on"))` via `eval` is required.
	luaExpr := fmt.Sprintf("hl.dispatch(hl.dsp.dpms(%q))", onOff)
	return dpmsCommandRunner("hyprctl", "eval", luaExpr)
}

// SetMonitorsDPMS toggles hardware display power standby (DPMS) across outputs
// so monitor backlights turn completely off while blanked, without calling
// `wlr-randr --off` (which disconnects Wayland wl_output globals and unmaps layer-shell surfaces).
func SetMonitorsDPMS(on bool) error {
	EnsureWaylandSessionEnv()

	onOff := "off"
	if on {
		onOff = "on"
	}

	if os.Getenv("HYPRLAND_INSTANCE_SIGNATURE") != "" {
		if _, err := exec.LookPath("hyprctl"); err == nil {
			return runHyprlandDPMS(onOff)
		}
	}

	if os.Getenv("NIRI_SOCKET") != "" {
		if _, err := exec.LookPath("niri"); err == nil {
			action := "power-off-monitors"
			if on {
				action = "power-on-monitors"
			}
			return dpmsCommandRunner("niri", "msg", "action", action)
		}
	}

	if os.Getenv("SWAYSOCK") != "" {
		if _, err := exec.LookPath("swaymsg"); err == nil {
			return dpmsCommandRunner("swaymsg", "output", "*", "power", onOff)
		}
	}

	if os.Getenv("WAYLAND_DISPLAY") != "" {
		if _, err := exec.LookPath("wlopm"); err == nil {
			flagArg := "--off"
			if on {
				flagArg = "--on"
			}
			return dpmsCommandRunner("wlopm", flagArg, "*")
		}
		if _, err := exec.LookPath("hyprctl"); err == nil {
			if err := runHyprlandDPMS(onOff); err == nil {
				return nil
			}
		}
		if _, err := exec.LookPath("niri"); err == nil {
			action := "power-off-monitors"
			if on {
				action = "power-on-monitors"
			}
			if err := dpmsCommandRunner("niri", "msg", "action", action); err == nil {
				return nil
			}
		}
		if _, err := exec.LookPath("swaymsg"); err == nil {
			if err := dpmsCommandRunner("swaymsg", "output", "*", "power", onOff); err == nil {
				return nil
			}
		}
		if strings.Contains(strings.ToLower(os.Getenv("XDG_CURRENT_DESKTOP")), "kde") {
			if _, err := exec.LookPath("kscreen-doctor"); err == nil {
				if err := dpmsCommandRunner("kscreen-doctor", "--dpms", onOff); err == nil {
					return nil
				}
			}
		}
	}

	if os.Getenv("WAYLAND_DISPLAY") == "" && os.Getenv("DISPLAY") != "" {
		if _, err := exec.LookPath("xset"); err == nil {
			return dpmsCommandRunner("xset", "dpms", "force", onOff)
		}
	}

	return nil
}
