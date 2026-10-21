// Package models defines the core data structures for the wscreensavers Wayland
// screensaver, live wallpaper, and screen-locking suite.
package models

import "time"

// SaverSource distinguishes between built-in native WebGL2/Canvas visualizers
// and external XScreenSaver binary executables (/usr/lib/xscreensaver/*).
type SaverSource string

const (
	SourceNative       SaverSource = "native"
	SourceXScreenSaver SaverSource = "xscreensaver"
)

// ParamType specifies the UI widget type for a configurable screensaver option.
type ParamType string

const (
	ParamRange   ParamType = "range"
	ParamBoolean ParamType = "boolean"
	ParamSelect  ParamType = "select"
	ParamColor   ParamType = "color"
	ParamString  ParamType = "string"
)

// SelectOption represents a single choice in a dropdown/select parameter.
type SelectOption struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Value  string `json:"value"`
	ArgSet string `json:"argSet,omitempty"` // Used by XScreenSaver XML <option arg-set="...">
}

// SaverParam defines a tunable parameter for a screensaver (either native or parsed from XML).
type SaverParam struct {
	ID          string         `json:"id"`
	Label       string         `json:"label"`
	Type        ParamType      `json:"type"`
	Default     any            `json:"default"`
	Min         float64        `json:"min,omitempty"`
	Max         float64        `json:"max,omitempty"`
	Step        float64        `json:"step,omitempty"`
	LowLabel    string         `json:"lowLabel,omitempty"`
	HighLabel   string         `json:"highLabel,omitempty"`
	Options     []SelectOption `json:"options,omitempty"`
	ArgSet      string         `json:"argSet,omitempty"`
	ArgFlag     string         `json:"argFlag,omitempty"`  // CLI template for XScreenSaver binary (e.g. "-count %")
	ArgUnset    string         `json:"argUnset,omitempty"` // CLI flag when boolean is false
	Convert     string         `json:"convert,omitempty"`  // e.g. "invert"
	Invert      bool           `json:"invert,omitempty"`   // Whether XScreenSaver <number convert="invert"> is set
	Description string         `json:"description,omitempty"`
}

// Screensaver represents a single screensaver ("hack") in the unified catalog.
type Screensaver struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Category    string       `json:"category"`
	Source      SaverSource  `json:"source"`
	Engine      string       `json:"engine"`
	Description string       `json:"description"`
	Author      string       `json:"author,omitempty"`
	Year        string       `json:"year,omitempty"`
	BinaryPath  string       `json:"binaryPath,omitempty"`
	BaseArgs    []string     `json:"baseArgs,omitempty"`
	Tags        []string     `json:"tags,omitempty"`
	AccentColor string       `json:"accentColor,omitempty"`
	PreviewGrad string       `json:"previewGrad,omitempty"`
	Params      []SaverParam `json:"params"`
	Installed   bool         `json:"installed"`
}

// MonitorOutput describes a connected Wayland display output (wl_output).
type MonitorOutput struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`        // e.g. "DP-1", "HDMI-A-1"
	Description string  `json:"description"` // Make/Model description
	Make        string  `json:"make"`
	Model       string  `json:"model"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	RefreshRate float64 `json:"refreshRate"`
	X           int     `json:"x"`
	Y           int     `json:"y"`
	Scale       float64 `json:"scale"`
	Focused     bool    `json:"focused"`
	Active      bool    `json:"active"`
}

// AppConfig holds the persistent user configuration saved to ~/.config/wscreensavers/config.json.
type AppConfig struct {
	Mode                string                    `json:"mode"` // "single", "random", "cycle", "disabled"
	SelectedSaver       string                    `json:"selectedSaver"`
	IdleTimeoutMinutes  int                       `json:"idleTimeoutMinutes"`
	CycleTimeoutMinutes int                       `json:"cycleTimeoutMinutes"`
	LockEnabled         bool                      `json:"lockEnabled"`
	LockGraceSeconds    int                       `json:"lockGraceSeconds"`
	LockProvider        string                    `json:"lockProvider"` // "native", "hyprlock", "swaylock"
	ShowClockOnSaver    bool                      `json:"showClockOnSaver"`
	InhibitOnAudio      bool                      `json:"inhibitOnAudio"`
	InhibitOnFullscreen bool                      `json:"inhibitOnFullscreen"`
	MultiMonitorMode    string                    `json:"multiMonitorMode"` // "independent", "clone", "per-monitor"
	PerMonitorSaver     map[string]string         `json:"perMonitorSaver"`  // outputName -> saverID
	WallpaperEnabled    bool                      `json:"wallpaperEnabled"`
	WallpaperSaver      string                    `json:"wallpaperSaver"`
	WallpaperPerMonitor map[string]string         `json:"wallpaperPerMonitor"`
	WallpaperFPSCap     int                       `json:"wallpaperFpsCap"`
	EnabledSavers       []string                  `json:"enabledSavers"`
	SaverParams         map[string]map[string]any `json:"saverParams"`
	DPMSOffMinutes      int                       `json:"dpmsOffMinutes"`
	PreferNativeOverX11 bool                      `json:"preferNativeOverX11"`
	XSSMaxStreamDim     int                       `json:"xssMaxStreamDim"` // long-edge pixel cap for OpenGL saver streams
}

// SystemBlip represents a real host or process blip displayed by the Sonar and Phosphor savers.
type SystemBlip struct {
	Label    string  `json:"label"`
	SubLabel string  `json:"subLabel"`
	Distance float64 `json:"distance"`
	Angle    float64 `json:"angle"`
	Load     float64 `json:"load"`
	Category string  `json:"category"` // "proc" or "net"
}

// DaemonStatus reports the real-time state of the Wayland idle & layer-shell daemon.
type DaemonStatus struct {
	Running           bool      `json:"running"`
	ScreensaverActive bool      `json:"screensaverActive"`
	WallpaperActive   bool      `json:"wallpaperActive"`
	Locked            bool      `json:"locked"`
	IdleSeconds       int       `json:"idleSeconds"`
	Inhibited         bool      `json:"inhibited"`
	InhibitReason     string    `json:"inhibitReason,omitempty"`
	ActiveSaverID     string    `json:"activeSaverId,omitempty"`
	LastStateChange   time.Time `json:"lastStateChange,omitempty"`
}
