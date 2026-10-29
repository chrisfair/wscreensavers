package display

import (
	"encoding/json"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
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
