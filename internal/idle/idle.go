package idle

import (
	"bufio"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"wscreensavers/internal/models"
)

type Monitor struct {
	mu                sync.RWMutex
	lastActivity      time.Time
	idleStartedAt     time.Time
	waylandActive     bool
	waylandIdle       bool
	lastCursorPos     string
	screensaverActive bool
	wallpaperActive   bool
	locked            bool
	closed            bool
	wlListener        *waylandIdleListener
	onResumeCallbacks []func()
}

func NewMonitor() *Monitor {
	m := &Monitor{
		lastActivity: time.Now(),
	}
	m.connectWaylandListener()
	return m
}

func (m *Monitor) connectWaylandListener() {
	m.mu.Lock()
	if m.closed || m.wlListener != nil {
		m.mu.Unlock()
		return
	}
	m.mu.Unlock()

	l := startWaylandIdleListener(1000, func() {
		m.mu.Lock()
		m.waylandIdle = true
		if m.idleStartedAt.IsZero() {
			m.idleStartedAt = time.Now().Add(-1 * time.Second)
		}
		m.mu.Unlock()
	}, func() {
		m.mu.Lock()
		m.waylandIdle = false
		m.lastActivity = time.Now()
		m.idleStartedAt = time.Time{}
		cbs := append([]func(){}, m.onResumeCallbacks...)
		m.mu.Unlock()
		for _, fn := range cbs {
			if fn != nil {
				fn()
			}
		}
	})

	if l != nil {
		m.mu.Lock()
		if m.closed {
			m.mu.Unlock()
			l.Stop()
			return
		}
		m.wlListener = l
		m.waylandActive = true
		m.mu.Unlock()
	}
}

// OnResume registers a callback invoked whenever user activity resumes on the Wayland seat.
func (m *Monitor) OnResume(fn func()) {
	if fn == nil {
		return
	}
	m.mu.Lock()
	m.onResumeCallbacks = append(m.onResumeCallbacks, fn)
	m.mu.Unlock()
}

// StartSeatWakeListener attaches a fast Wayland ext-idle-notify-v1 listener (250ms)
// that fires onResume whenever any keyboard or pointer activity occurs on the seat.
func StartSeatWakeListener(onResume func()) func() {
	l := startWaylandIdleListener(250, func() {}, func() {
		if onResume != nil {
			onResume()
		}
	})
	if l == nil {
		return func() {}
	}
	return func() {
		l.Stop()
	}
}

func (m *Monitor) RecordActivity() {
	m.mu.Lock()
	m.lastActivity = time.Now()
	m.waylandIdle = false
	m.idleStartedAt = time.Time{}
	cbs := append([]func(){}, m.onResumeCallbacks...)
	m.mu.Unlock()
	for _, fn := range cbs {
		if fn != nil {
			fn()
		}
	}
}

func (m *Monitor) Close() {
	m.mu.Lock()
	m.closed = true
	l := m.wlListener
	m.wlListener = nil
	m.waylandActive = false
	m.mu.Unlock()

	if l != nil {
		l.Stop()
	}
}

func (m *Monitor) SetScreensaverActive(active bool, locked bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.screensaverActive = active
	m.locked = locked
	if !active {
		m.lastActivity = time.Now()
		m.waylandIdle = false
		m.idleStartedAt = time.Time{}
	}
}

func (m *Monitor) SetWallpaperActive(active bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.wallpaperActive = active
}

// PollCursorActivity checks Hyprland cursorpos to detect pointer motion on Wayland.
// Used as a fallback when ext-idle-notify-v1 is unavailable.
func (m *Monitor) PollCursorActivity() {
	out, err := exec.Command("hyprctl", "cursorpos").Output()
	if err != nil {
		return
	}
	pos := strings.TrimSpace(string(out))
	if pos == "" {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.lastCursorPos != "" && m.lastCursorPos != pos {
		m.lastActivity = time.Now()
		m.waylandIdle = false
		m.idleStartedAt = time.Time{}
	}
	m.lastCursorPos = pos
}

func (m *Monitor) IsAudioPlaying() bool {
	// Check PipeWire / PulseAudio running sink inputs via pactl.
	// If pactl executes successfully, trust its report: if no un-corked sink inputs are
	// playing, audio is idle. We must not fall through to ALSA, because PipeWire and
	// WirePlumber can hold hardware PCM sinks in RUNNING state (e.g. session.suspend-timeout-seconds = 0)
	// even when completely silent.
	if out, err := exec.Command("pactl", "list", "sink-inputs").Output(); err == nil {
		return strings.Contains(string(out), "Corked: no")
	}

	// Fallback: check ALSA hardware PCM status only when pactl is unavailable or failed.
	matches, _ := filepath.Glob("/proc/asound/card*/pcm*/sub*/status")
	for _, statusFile := range matches {
		data, err := os.ReadFile(statusFile)
		if err == nil && strings.Contains(string(data), "state: RUNNING") {
			return true
		}
	}
	return false
}

func (m *Monitor) IsFullscreenAppActive() bool {
	out, err := exec.Command("hyprctl", "activewindow", "-j").Output()
	if err != nil || len(out) == 0 {
		return false
	}
	var win struct {
		Fullscreen int    `json:"fullscreen"`
		Class      string `json:"class"`
	}
	if err := json.Unmarshal(out, &win); err != nil {
		return false
	}
	if strings.Contains(strings.ToLower(win.Class), "wscreensavers") {
		return false
	}
	return win.Fullscreen > 0
}

func (m *Monitor) Status(inhibitAudio, inhibitFullscreen bool) models.DaemonStatus {
	m.connectWaylandListener()
	m.PollCursorActivity()

	m.mu.RLock()
	var idleSec int
	if m.waylandActive {
		if m.waylandIdle && !m.idleStartedAt.IsZero() {
			idleSec = int(time.Since(m.idleStartedAt).Seconds())
		} else {
			idleSec = int(time.Since(m.lastActivity).Seconds())
			if idleSec < 0 {
				idleSec = 0
			}
		}
	} else {
		idleSec = int(time.Since(m.lastActivity).Seconds())
	}
	saverActive := m.screensaverActive
	wpActive := m.wallpaperActive
	locked := m.locked
	m.mu.RUnlock()

	var reasons []string
	if inhibitAudio && m.IsAudioPlaying() {
		reasons = append(reasons, "Media Audio Active (PipeWire/ALSA)")
	}
	if inhibitFullscreen && m.IsFullscreenAppActive() {
		reasons = append(reasons, "Fullscreen Window Active")
	}

	return models.DaemonStatus{
		Running:           true,
		IdleSeconds:       idleSec,
		Inhibited:         len(reasons) > 0,
		InhibitReason:     strings.Join(reasons, ", "),
		ScreensaverActive: saverActive,
		WallpaperActive:   wpActive,
		Locked:            locked,
	}
}

// ScanSystemBlips gathers live processes and ARP/network peers for the Sonar and Phosphor screensavers.
func ScanSystemBlips() []models.SystemBlip {
	var blips []models.SystemBlip

	// 1. Read ARP table (/proc/net/arp) for local subnet hosts
	if arpFile, err := os.Open("/proc/net/arp"); err == nil {
		scanner := bufio.NewScanner(arpFile)
		idx := 0
		for scanner.Scan() {
			line := scanner.Text()
			if idx == 0 {
				idx++
				continue
			}
			fields := strings.Fields(line)
			if len(fields) >= 6 && fields[2] != "0x0" {
				ip := fields[0]
				dev := fields[5]
				angle := math.Mod(float64(idx)*1.17, math.Pi*2)
				dist := 0.35 + math.Mod(float64(idx)*0.19, 0.55)
				blips = append(blips, models.SystemBlip{
					Label:    fmt.Sprintf("%s (%s)", ip, dev),
					SubLabel: "LAN Peer",
					Distance: dist,
					Angle:    angle,
					Load:     0.65,
					Category: "net",
				})
				idx++
			}
		}
		arpFile.Close()
	}

	// 2. Scan top active processes from /proc
	entries, err := os.ReadDir("/proc")
	if err == nil {
		type procEntry struct {
			pid  int
			name string
			rss  int64
		}
		var procs []procEntry
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			pid, err := strconv.Atoi(e.Name())
			if err != nil || pid < 100 {
				continue
			}
			commBytes, err := os.ReadFile(filepath.Join("/proc", e.Name(), "comm"))
			if err != nil {
				continue
			}
			name := strings.TrimSpace(string(commBytes))
			if name == "" || strings.HasPrefix(name, "kworker") || strings.HasPrefix(name, "migration") {
				continue
			}
			statmBytes, err := os.ReadFile(filepath.Join("/proc", e.Name(), "statm"))
			var rss int64 = 100
			if err == nil {
				parts := strings.Fields(string(statmBytes))
				if len(parts) >= 2 {
					rss, _ = strconv.ParseInt(parts[1], 10, 64)
				}
			}
			procs = append(procs, procEntry{pid: pid, name: name, rss: rss})
		}

		sort.Slice(procs, func(i, j int) bool {
			return procs[i].rss > procs[j].rss
		})

		limit := 16
		if len(procs) < limit {
			limit = len(procs)
		}
		for i := 0; i < limit; i++ {
			p := procs[i]
			angle := math.Mod(float64(p.pid)*0.6180339887*math.Pi*2, math.Pi*2)
			dist := 0.18 + (float64(i)/float64(limit))*0.74
			memMB := float64(p.rss*4) / 1024.0
			blips = append(blips, models.SystemBlip{
				Label:    fmt.Sprintf("%s [%d]", p.name, p.pid),
				SubLabel: fmt.Sprintf("%.0f MB", memMB),
				Distance: dist,
				Angle:    angle,
				Load:     math.Min(1.0, memMB/1024.0+0.25),
				Category: "proc",
			})
		}
	}

	return blips
}

// SystemTelemetryFeed returns real-time Linux kernel/host lines for the Phosphor terminal screensaver.
func SystemTelemetryFeed() []string {
	var lines []string
	hostname, _ := os.Hostname()
	now := time.Now().Format("2006-01-02 15:04:05 MST")
	lines = append(lines, fmt.Sprintf("WSCREENSAVERS WAYLAND TELEMETRY // NODE: %s // %s", strings.ToUpper(hostname), now))

	if data, err := os.ReadFile("/proc/version"); err == nil {
		lines = append(lines, "KERNEL: "+strings.TrimSpace(string(data)))
	}
	if data, err := os.ReadFile("/proc/loadavg"); err == nil {
		lines = append(lines, "LOADAVG: "+strings.TrimSpace(string(data)))
	}
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		scanner := bufio.NewScanner(strings.NewReader(string(data)))
		count := 0
		for scanner.Scan() && count < 6 {
			lines = append(lines, "MEM :: "+scanner.Text())
			count++
		}
	}
	blips := ScanSystemBlips()
	for _, b := range blips {
		lines = append(lines, fmt.Sprintf("RADAR [%s] %-26s DIST=%.2f ACT=%.0f%% (%s)",
			strings.ToUpper(b.Category), b.Label, b.Distance, b.Load*100, b.SubLabel))
	}
	return lines
}
