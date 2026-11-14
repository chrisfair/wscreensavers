package mediaguard

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

const (
	StateFileName       = "wscreensavers-media-guard.json"
	LegacyStateFileName = "screenlock-media-guard-state.json"
)

var directRecorderBins = map[string]bool{
	"gpu-screen-recorder":  true,
	"wf-recorder":          true,
	"wl-screenrec":         true,
	"pw-record":            true,
	"parec":                true,
	"arecord":              true,
	"kooha":                true,
	"simplescreenrecorder": true,
	"guvcview":             true,
	"cheese":               true,
}

var headlessAudioPlayers = map[string]bool{
	"aplay":   true,
	"paplay":  true,
	"pw-play": true,
	"mpg123":  true,
	"ogg123":  true,
}

var externalLockerBins = map[string]bool{
	"hyprlock": true,
	"swaylock": true,
	"gtklock":  true,
	"waylock":  true,
}

var ffmpegCaptureDrivers = map[string]bool{
	"pulse":        true,
	"pipewire":     true,
	"alsa":         true,
	"v4l2":         true,
	"video4linux2": true,
	"kmsgrab":      true,
	"x11grab":      true,
}

// PausedProc tracks a headless CLI audio process paused with SIGSTOP so SIGCONT
// is only sent to the exact same process instance (verified via /proc/<pid>/stat starttime).
type PausedProc struct {
	PID       int    `json:"pid"`
	StartTime string `json:"starttime"`
	Comm      string `json:"comm"`
}

// GuardState persists pre-lock mute states and paused players across process restarts.
type GuardState struct {
	Source         string          `json:"source,omitempty"` // "lock", "daemon", or "ctl"
	LockedAt       float64         `json:"locked_at"`
	PausedMPRIS    []string        `json:"paused_mpris"`
	PausedCLIProcs []PausedProc    `json:"paused_cli_procs"`
	SinkMutes      map[string]bool `json:"sink_mutes"`
	SinkInputMutes map[string]bool `json:"sink_input_mutes"`
	SourceMutes    map[string]bool `json:"source_mutes"`
}

// ProcInfo describes a user-owned process from /proc.
type ProcInfo struct {
	PID       int
	PPID      int
	Comm      string
	Argv      []string
	StartTime string
}

type cmdFunc func(timeout time.Duration, name string, args ...string) (string, error)
type procListFunc func() []ProcInfo
type killFunc func(pid int, sig syscall.Signal) error
type procAliveFunc func(pid int) bool
type subscribeFunc func(ctx context.Context) (io.ReadCloser, func(), error)

// Guard manages pausing/resuming playback, muting/unmuting PipeWire/PulseAudio,
// and stopping active recordings while the screen lock is engaged.
type Guard struct {
	mu            sync.Mutex
	statePath     string
	legacyPath    string
	engaged       bool
	engagedAt     time.Time
	state         GuardState
	runCmd        cmdFunc
	listProcs     procListFunc
	sendSignal    killFunc
	isProcAlive   procAliveFunc
	procStartTime func(pid int) string
	startSub      subscribeFunc
	sleep         func(time.Duration)
}

// RuntimeDir returns XDG_RUNTIME_DIR or /run/user/<uid>.
func RuntimeDir() string {
	if xdg := strings.TrimSpace(os.Getenv("XDG_RUNTIME_DIR")); xdg != "" {
		return xdg
	}
	return fmt.Sprintf("/run/user/%d", os.Getuid())
}

// New creates a Guard storing transient lock state in stateDir (defaults to RuntimeDir()).
func New(stateDir string) *Guard {
	if stateDir == "" {
		stateDir = RuntimeDir()
	}
	g := &Guard{
		statePath:  filepath.Join(stateDir, StateFileName),
		legacyPath: filepath.Join(stateDir, LegacyStateFileName),
		state:      emptyState(),
		runCmd:     defaultRunCmd,
		sendSignal: syscall.Kill,
		isProcAlive: func(pid int) bool {
			_, err := os.Stat(fmt.Sprintf("/proc/%d", pid))
			return err == nil
		},
		procStartTime: readProcStartTime,
		startSub:      defaultStartSubscribe,
		sleep:         time.Sleep,
	}
	g.listProcs = func() []ProcInfo {
		return scanUserProcs(os.Getuid(), os.Getpid())
	}
	return g
}

func emptyState() GuardState {
	return GuardState{
		PausedMPRIS:    []string{},
		PausedCLIProcs: []PausedProc{},
		SinkMutes:      map[string]bool{},
		SinkInputMutes: map[string]bool{},
		SourceMutes:    map[string]bool{},
	}
}

func defaultRunCmd(timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	out, err := cmd.Output()
	return string(out), err
}

func defaultStartSubscribe(ctx context.Context) (io.ReadCloser, func(), error) {
	cmd := exec.CommandContext(ctx, "pactl", "subscribe")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, nil, err
	}
	cleanup := func() {
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		_ = cmd.Wait()
	}
	return stdout, cleanup, nil
}

func parseProcStat(raw string) (ppid int, startTime string, ok bool) {
	rparen := strings.LastIndexByte(raw, ')')
	if rparen == -1 || rparen+2 >= len(raw) {
		return 0, "", false
	}
	fields := strings.Fields(raw[rparen+2:])
	// After "(comm) ", index 0 is state, index 1 is ppid, index 19 is starttime (field 22).
	if len(fields) <= 19 {
		return 0, "", false
	}
	p, err := strconv.Atoi(fields[1])
	if err != nil {
		return 0, "", false
	}
	return p, fields[19], true
}

func readProcStartTime(pid int) string {
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if err != nil {
		return ""
	}
	_, st, ok := parseProcStat(string(data))
	if !ok {
		return ""
	}
	return st
}

func scanUserProcs(uid, skipPID int) []ProcInfo {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return nil
	}
	var out []ProcInfo
	for _, entry := range entries {
		name := entry.Name()
		pid, err := strconv.Atoi(name)
		if err != nil || pid <= 0 || pid == skipPID {
			continue
		}
		procDir := filepath.Join("/proc", name)
		fi, err := os.Stat(procDir)
		if err != nil {
			continue
		}
		st, ok := fi.Sys().(*syscall.Stat_t)
		if !ok || int(st.Uid) != uid {
			continue
		}
		commBytes, err := os.ReadFile(filepath.Join(procDir, "comm"))
		if err != nil {
			continue
		}
		statBytes, err := os.ReadFile(filepath.Join(procDir, "stat"))
		if err != nil {
			continue
		}
		ppid, startTime, ok := parseProcStat(string(statBytes))
		if !ok {
			continue
		}
		cmdBytes, _ := os.ReadFile(filepath.Join(procDir, "cmdline"))
		var argv []string
		for _, part := range strings.Split(string(cmdBytes), "\x00") {
			if part != "" {
				argv = append(argv, part)
			}
		}
		out = append(out, ProcInfo{
			PID:       pid,
			PPID:      ppid,
			Comm:      strings.TrimSpace(string(commBytes)),
			Argv:      argv,
			StartTime: startTime,
		})
	}
	return out
}

// IsExternalLockerRunning reports whether hyprlock, swaylock, gtklock, or waylock is running.
func IsExternalLockerRunning() bool {
	return isExternalLockerInProcs(scanUserProcs(os.Getuid(), os.Getpid()))
}

func isExternalLockerInProcs(procs []ProcInfo) bool {
	for _, p := range procs {
		exeBase := ""
		if len(p.Argv) > 0 {
			exeBase = filepath.Base(p.Argv[0])
		}
		if externalLockerBins[p.Comm] || externalLockerBins[exeBase] {
			return true
		}
	}
	return false
}

// HasActiveState reports whether a persisted lock media guard state file exists.
func HasActiveState(stateDir string) bool {
	if stateDir == "" {
		stateDir = RuntimeDir()
	}
	if _, err := os.Stat(filepath.Join(stateDir, StateFileName)); err == nil {
		return true
	}
	if _, err := os.Stat(filepath.Join(stateDir, LegacyStateFileName)); err == nil {
		return true
	}
	return false
}

// RecoverIfUnlocked restores pre-lock audio state if a stale guard state file was left
// behind by an abnormal --lock exit or external locker and no lock screen is running.
func RecoverIfUnlocked(stateDir string) bool {
	g := New(stateDir)
	st, ok := g.loadPersistedState()
	if !ok {
		return false
	}
	// Do not auto-release explicit external `ctl media-lock` states unless older than 12h.
	if st.Source == "ctl" && st.LockedAt > 0 && time.Since(time.Unix(int64(st.LockedAt), 0)) < 12*time.Hour {
		return false
	}
	g.mu.Lock()
	g.state = st
	g.engaged = true
	g.mu.Unlock()
	g.Release()
	return true
}

func hasWScreenSaversAncestor(pid int, byPID map[int]ProcInfo) bool {
	cur := pid
	for depth := 0; depth < 6; depth++ {
		info, ok := byPID[cur]
		if !ok || info.PPID <= 1 {
			return false
		}
		parent, ok := byPID[info.PPID]
		if !ok {
			// Check /proc/<ppid>/comm directly in case parent wasn't in filtered list.
			commBytes, err := os.ReadFile(fmt.Sprintf("/proc/%d/comm", info.PPID))
			if err != nil {
				return false
			}
			if strings.TrimSpace(string(commBytes)) == "wscreensavers" {
				return true
			}
			return false
		}
		if parent.Comm == "wscreensavers" || (len(parent.Argv) > 0 && filepath.Base(parent.Argv[0]) == "wscreensavers") {
			return true
		}
		cur = parent.PID
	}
	return false
}

func isLiveCaptureFFmpeg(p ProcInfo, byPID map[int]ProcInfo) bool {
	if len(p.Argv) == 0 || filepath.Base(p.Argv[0]) != "ffmpeg" {
		return false
	}
	// Never touch wscreensavers's own Xvfb -> MJPEG WebView stream helpers.
	for _, arg := range p.Argv {
		if arg == "mpjpeg" {
			return false
		}
	}
	if hasWScreenSaversAncestor(p.PID, byPID) {
		return false
	}
	for i := 1; i < len(p.Argv); i++ {
		arg := p.Argv[i]
		if arg == "-f" && i+1 < len(p.Argv) {
			if ffmpegCaptureDrivers[strings.ToLower(p.Argv[i+1])] {
				return true
			}
		}
		if strings.HasPrefix(arg, "/dev/video") || strings.Contains(arg, ".monitor") || strings.Contains(arg, "alsa_input") {
			return true
		}
	}
	return false
}

func isRecorderProcess(p ProcInfo, byPID map[int]ProcInfo) bool {
	if hasWScreenSaversAncestor(p.PID, byPID) {
		return false
	}
	exeBase := p.Comm
	if len(p.Argv) > 0 {
		exeBase = filepath.Base(p.Argv[0])
	}
	if directRecorderBins[p.Comm] || directRecorderBins[exeBase] {
		return true
	}
	if exeBase == "pw-cat" || exeBase == "pacat" {
		for _, arg := range p.Argv[1:] {
			if arg == "--record" || arg == "-r" {
				return true
			}
		}
	}
	if exeBase == "rec" && len(p.Argv) >= 2 {
		return true
	}
	return isLiveCaptureFFmpeg(p, byPID)
}

type pactlDevice struct {
	Index      int               `json:"index"`
	Name       string            `json:"name"`
	Mute       bool              `json:"mute"`
	Corked     bool              `json:"corked"`
	Properties map[string]string `json:"properties"`
}

func (g *Guard) pactlList(kind string) []pactlDevice {
	out, err := g.runCmd(2500*time.Millisecond, "pactl", "-f", "json", "list", kind)
	if err != nil || strings.TrimSpace(out) == "" {
		return nil
	}
	var items []pactlDevice
	if err := json.Unmarshal([]byte(out), &items); err != nil {
		return nil
	}
	return items
}

func (g *Guard) listActiveMPRISServices() (services []string, viaPlayerctl bool) {
	out, err := g.runCmd(2*time.Second, "busctl", "--user", "list", "--no-pager", "--no-legend")
	if err == nil {
		for _, line := range strings.Split(out, "\n") {
			fields := strings.Fields(line)
			if len(fields) < 3 {
				continue
			}
			svc, pidCol := fields[0], fields[1]
			if !strings.HasPrefix(svc, "org.mpris.MediaPlayer2.") {
				continue
			}
			if svc == "org.mpris.MediaPlayer2.playerctld" {
				continue
			}
			if pidCol == "-" || strings.Contains(line, "(activatable)") {
				continue
			}
			services = append(services, svc)
		}
		return services, false
	}

	// Fallback to playerctl if busctl is unavailable
	pOut, pErr := g.runCmd(1500*time.Millisecond, "playerctl", "-l")
	if pErr != nil {
		return nil, false
	}
	for _, line := range strings.Split(pOut, "\n") {
		p := strings.TrimSpace(line)
		if p != "" && p != "playerctld" {
			services = append(services, p)
		}
	}
	return services, true
}

func (g *Guard) mprisGetStatus(service string, viaPlayerctl bool) string {
	if viaPlayerctl {
		out, err := g.runCmd(1500*time.Millisecond, "playerctl", "-p", service, "status")
		if err != nil {
			return ""
		}
		return strings.TrimSpace(out)
	}
	out, err := g.runCmd(
		1500*time.Millisecond,
		"busctl", "--user", "get-property",
		service,
		"/org/mpris/MediaPlayer2",
		"org.mpris.MediaPlayer2.Player",
		"PlaybackStatus",
	)
	if err != nil {
		return ""
	}
	if first := strings.IndexByte(out, '"'); first != -1 {
		rest := out[first+1:]
		if second := strings.IndexByte(rest, '"'); second != -1 {
			return rest[:second]
		}
	}
	return ""
}

func (g *Guard) mprisCall(service, method string, viaPlayerctl bool) bool {
	if viaPlayerctl {
		_, err := g.runCmd(1500*time.Millisecond, "playerctl", "-p", service, strings.ToLower(method))
		return err == nil
	}
	_, err := g.runCmd(
		1500*time.Millisecond,
		"busctl", "--user", "call",
		service,
		"/org/mpris/MediaPlayer2",
		"org.mpris.MediaPlayer2.Player",
		method,
	)
	return err == nil
}

type pwDumpNode struct {
	ID   int `json:"id"`
	Info struct {
		Props map[string]any `json:"props"`
	} `json:"info"`
}

func (g *Guard) stopAllRecordingsLocked() int {
	stopped := 0
	procs := g.listProcs()
	byPID := make(map[int]ProcInfo, len(procs))
	qsRunning := false
	obsRunning := false

	for _, p := range procs {
		byPID[p.PID] = p
		exeBase := ""
		if len(p.Argv) > 0 {
			exeBase = filepath.Base(p.Argv[0])
		}
		if p.Comm == "quickshell" || p.Comm == "qs" || exeBase == "quickshell" || exeBase == "qs" {
			qsRunning = true
		}
		if p.Comm == "obs" || exeBase == "obs" {
			obsRunning = true
		}
	}

	if qsRunning {
		_, _ = g.runCmd(1200*time.Millisecond, "qs", "-c", "noctalia-shell", "ipc", "call", "plugin:screen-recorder", "stop")
		_, _ = g.runCmd(1200*time.Millisecond, "qs", "-c", "noctalia-shell", "ipc", "call", "plugin:screen-recorder", "stopReplay")
		_, _ = g.runCmd(1200*time.Millisecond, "qs", "-c", "noctalia-shell", "ipc", "call", "plugin:screen-toolkit", "recordStop")
	}
	if obsRunning {
		_, _ = g.runCmd(1500*time.Millisecond, "obs-cmd", "recording", "stop")
	}

	var signaledPIDs []int
	for _, p := range procs {
		if isRecorderProcess(p, byPID) {
			if err := g.sendSignal(p.PID, syscall.SIGINT); err == nil {
				signaledPIDs = append(signaledPIDs, p.PID)
				stopped++
				log.Printf("mediaguard: stopped recorder process pid=%d (%s)", p.PID, p.Comm)
			}
		}
	}

	if len(signaledPIDs) > 0 {
		for attempt := 0; attempt < 9; attempt++ {
			anyAlive := false
			for _, pid := range signaledPIDs {
				if g.isProcAlive(pid) {
					anyAlive = true
					break
				}
			}
			if !anyAlive {
				break
			}
			g.sleep(50 * time.Millisecond)
		}
		for _, pid := range signaledPIDs {
			if g.isProcAlive(pid) {
				_ = g.sendSignal(pid, syscall.SIGTERM)
			}
		}
	}

	for _, so := range g.pactlList("source-outputs") {
		_, _ = g.runCmd(time.Second, "pactl", "set-source-output-mute", strconv.Itoa(so.Index), "1")
	}

	pwOut, err := g.runCmd(2*time.Second, "pw-dump")
	if err == nil && strings.TrimSpace(pwOut) != "" {
		var nodes []pwDumpNode
		if json.Unmarshal([]byte(pwOut), &nodes) == nil {
			for _, n := range nodes {
				if n.Info.Props == nil {
					continue
				}
				mediaClass, _ := n.Info.Props["media.class"].(string)
				if mediaClass != "Stream/Input/Audio" && mediaClass != "Stream/Input/Video" {
					continue
				}
				mediaName, _ := n.Info.Props["media.name"].(string)
				if mediaName == "Peak detect" {
					continue
				}
				_, _ = g.runCmd(1200*time.Millisecond, "pw-cli", "destroy", strconv.Itoa(n.ID))
				stopped++
			}
		}
	}

	return stopped
}

func (g *Guard) loadPersistedState() (GuardState, bool) {
	for _, p := range []string{g.statePath, g.legacyPath} {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		st := emptyState()
		if err := json.Unmarshal(data, &st); err != nil {
			continue
		}
		if st.SinkMutes == nil {
			st.SinkMutes = map[string]bool{}
		}
		if st.SinkInputMutes == nil {
			st.SinkInputMutes = map[string]bool{}
		}
		if st.SourceMutes == nil {
			st.SourceMutes = map[string]bool{}
		}
		return st, true
	}
	return emptyState(), false
}

func (g *Guard) saveStateLocked() {
	tmp := g.statePath + ".tmp"
	data, err := json.MarshalIndent(g.state, "", "  ")
	if err != nil {
		return
	}
	if err := os.MkdirAll(filepath.Dir(g.statePath), 0700); err != nil {
		return
	}
	if err := os.WriteFile(tmp, data, 0600); err != nil {
		return
	}
	_ = os.Rename(tmp, g.statePath)
}

func (g *Guard) clearStateFiles() {
	_ = os.Remove(g.statePath)
	_ = os.Remove(g.statePath + ".tmp")
	_ = os.Remove(g.legacyPath)
}

func appendUnique(list []string, item string) []string {
	for _, v := range list {
		if v == item {
			return list
		}
	}
	return append(list, item)
}

// Engage pauses playing media, stops active recordings, snapshots hardware mute states,
// and mutes PipeWire/PulseAudio sinks & sources according to pauseMedia and stopRecording.
func (g *Guard) Engage(pauseMedia, stopRecording bool) {
	g.EngageWithSource("lock", pauseMedia, stopRecording)
}

// EngageWithSource is like Engage but tags the persisted state with a source identifier.
func (g *Guard) EngageWithSource(source string, pauseMedia, stopRecording bool) {
	if !pauseMedia && !stopRecording {
		return
	}

	g.mu.Lock()
	defer g.mu.Unlock()

	if g.engaged {
		return
	}

	// Preserve any pre-existing persisted mute snapshot so a re-entrant lock never
	// overwrites the user's true pre-lock unmuted state with muted=true.
	prior, hadPrior := g.loadPersistedState()
	if hadPrior {
		g.state = prior
	} else {
		g.state = emptyState()
	}
	if source != "" {
		g.state.Source = source
	}
	g.engaged = true
	g.engagedAt = time.Now()
	if g.state.LockedAt == 0 {
		g.state.LockedAt = float64(g.engagedAt.Unix())
	}

	if pauseMedia {
		services, viaPlayerctl := g.listActiveMPRISServices()
		for _, svc := range services {
			if g.mprisGetStatus(svc, viaPlayerctl) == "Playing" {
				if g.mprisCall(svc, "Pause", viaPlayerctl) {
					g.state.PausedMPRIS = appendUnique(g.state.PausedMPRIS, svc)
					log.Printf("mediaguard: paused MPRIS player %s", svc)
				}
			}
		}

		procs := g.listProcs()
		commByPID := make(map[int]ProcInfo, len(procs))
		for _, p := range procs {
			commByPID[p.PID] = p
		}

		sinkInputs := g.pactlList("sink-inputs")
		for _, si := range sinkInputs {
			if si.Corked {
				continue
			}
			pid, err := strconv.Atoi(si.Properties["application.process.id"])
			if err != nil || pid <= 0 {
				continue
			}
			pInfo, ok := commByPID[pid]
			if !ok || !headlessAudioPlayers[pInfo.Comm] || pInfo.StartTime == "" {
				continue
			}
			if err := g.sendSignal(pid, syscall.SIGSTOP); err == nil {
				g.state.PausedCLIProcs = append(g.state.PausedCLIProcs, PausedProc{
					PID:       pid,
					StartTime: pInfo.StartTime,
					Comm:      pInfo.Comm,
				})
			}
		}

		for _, sink := range g.pactlList("sinks") {
			if sink.Name == "" {
				continue
			}
			if _, exists := g.state.SinkMutes[sink.Name]; !exists {
				g.state.SinkMutes[sink.Name] = sink.Mute
			}
			_, _ = g.runCmd(1200*time.Millisecond, "pactl", "set-sink-mute", sink.Name, "1")
		}

		for _, si := range sinkInputs {
			key := strconv.Itoa(si.Index)
			if _, exists := g.state.SinkInputMutes[key]; !exists {
				g.state.SinkInputMutes[key] = si.Mute
			}
			_, _ = g.runCmd(time.Second, "pactl", "set-sink-input-mute", key, "1")
		}
	}

	if stopRecording {
		for _, src := range g.pactlList("sources") {
			if src.Name == "" {
				continue
			}
			if _, exists := g.state.SourceMutes[src.Name]; !exists {
				g.state.SourceMutes[src.Name] = src.Mute
			}
		}

		g.stopAllRecordingsLocked()

		for srcName := range g.state.SourceMutes {
			_, _ = g.runCmd(1200*time.Millisecond, "pactl", "set-source-mute", srcName, "1")
		}
	}

	g.saveStateLocked()
}

// Enforce re-applies playback pause, sink/source mute, and recording termination while locked.
func (g *Guard) Enforce(pauseMedia, stopRecording bool) {
	if !pauseMedia && !stopRecording {
		return
	}

	g.mu.Lock()
	defer g.mu.Unlock()
	if !g.engaged {
		return
	}

	dirty := false
	if pauseMedia {
		services, viaPlayerctl := g.listActiveMPRISServices()
		for _, svc := range services {
			if g.mprisGetStatus(svc, viaPlayerctl) == "Playing" {
				g.mprisCall(svc, "Pause", viaPlayerctl)
				if time.Since(g.engagedAt) <= 2500*time.Millisecond {
					before := len(g.state.PausedMPRIS)
					g.state.PausedMPRIS = appendUnique(g.state.PausedMPRIS, svc)
					if len(g.state.PausedMPRIS) != before {
						dirty = true
					}
				}
			}
		}

		for _, sink := range g.pactlList("sinks") {
			if sink.Name != "" && !sink.Mute {
				if _, exists := g.state.SinkMutes[sink.Name]; !exists {
					g.state.SinkMutes[sink.Name] = false
					dirty = true
				}
				_, _ = g.runCmd(time.Second, "pactl", "set-sink-mute", sink.Name, "1")
			}
		}

		for _, si := range g.pactlList("sink-inputs") {
			if !si.Mute {
				key := strconv.Itoa(si.Index)
				if _, exists := g.state.SinkInputMutes[key]; !exists {
					g.state.SinkInputMutes[key] = false
					dirty = true
				}
				_, _ = g.runCmd(time.Second, "pactl", "set-sink-input-mute", key, "1")
			}
		}
	}

	if stopRecording {
		g.stopAllRecordingsLocked()
		for _, src := range g.pactlList("sources") {
			if src.Name != "" && !src.Mute {
				if _, exists := g.state.SourceMutes[src.Name]; !exists {
					g.state.SourceMutes[src.Name] = false
					dirty = true
				}
				_, _ = g.runCmd(time.Second, "pactl", "set-source-mute", src.Name, "1")
			}
		}
	}

	if dirty {
		g.saveStateLocked()
	}
}

func isRelevantSubscribeLine(line string) bool {
	// Ignore "on client" events because invoking pactl itself generates client connect/disconnect
	// notifications, which would otherwise re-trigger enforcement in a loop.
	return strings.Contains(line, "on sink") ||
		strings.Contains(line, "on source") ||
		strings.Contains(line, "on server")
}

// StartWatchLoop subscribes to PipeWire/PulseAudio sink and source events while locked
// and returns an idempotent stop function.
func (g *Guard) StartWatchLoop(pauseMedia, stopRecording bool) func() {
	if !pauseMedia && !stopRecording {
		return func() {}
	}
	ctx, cancel := context.WithCancel(context.Background())
	var once sync.Once
	done := make(chan struct{})

	go func() {
		defer close(done)
		stdout, cleanup, err := g.startSub(ctx)
		if err != nil {
			return
		}
		defer cleanup()

		triggerCh := make(chan struct{}, 1)
		go func() {
			scanner := bufio.NewScanner(stdout)
			for scanner.Scan() {
				if isRelevantSubscribeLine(scanner.Text()) {
					select {
					case triggerCh <- struct{}{}:
					default:
					}
				}
			}
		}()

		var debounce *time.Timer
		var debounceC <-chan time.Time
		for {
			select {
			case <-ctx.Done():
				if debounce != nil {
					debounce.Stop()
				}
				return
			case <-triggerCh:
				if debounce == nil {
					debounce = time.NewTimer(400 * time.Millisecond)
					debounceC = debounce.C
				}
			case <-debounceC:
				debounce = nil
				debounceC = nil
				g.Enforce(pauseMedia, stopRecording)
			}
		}
	}()

	return func() {
		once.Do(func() {
			cancel()
			<-done
		})
	}
}

// Release restores pre-lock sink and source mute states and resumes media players that
// were actively playing when the lock engaged. Stopped recordings remain stopped.
func (g *Guard) Release() {
	g.mu.Lock()
	defer g.mu.Unlock()

	if !g.engaged {
		loaded, ok := g.loadPersistedState()
		if !ok {
			return
		}
		g.state = loaded
	}
	g.engaged = false

	if len(g.state.SinkMutes) > 0 {
		for _, sink := range g.pactlList("sinks") {
			if sink.Name == "" {
				continue
			}
			muteVal := "0"
			if g.state.SinkMutes[sink.Name] {
				muteVal = "1"
			}
			_, _ = g.runCmd(1200*time.Millisecond, "pactl", "set-sink-mute", sink.Name, muteVal)
		}
	}

	if len(g.state.SinkInputMutes) > 0 {
		for _, si := range g.pactlList("sink-inputs") {
			key := strconv.Itoa(si.Index)
			muteVal := "0"
			if g.state.SinkInputMutes[key] {
				muteVal = "1"
			}
			_, _ = g.runCmd(time.Second, "pactl", "set-sink-input-mute", key, muteVal)
		}
	}

	if len(g.state.SourceMutes) > 0 {
		for _, src := range g.pactlList("sources") {
			if src.Name == "" {
				continue
			}
			muteVal := "0"
			if g.state.SourceMutes[src.Name] {
				muteVal = "1"
			}
			_, _ = g.runCmd(1200*time.Millisecond, "pactl", "set-source-mute", src.Name, muteVal)
		}
	}

	if len(g.state.PausedCLIProcs) > 0 || len(g.state.PausedMPRIS) > 0 {
		g.sleep(150 * time.Millisecond)
	}

	for _, item := range g.state.PausedCLIProcs {
		if item.PID > 0 && item.StartTime != "" && g.procStartTime(item.PID) == item.StartTime {
			_ = g.sendSignal(item.PID, syscall.SIGCONT)
		}
	}

	if len(g.state.PausedMPRIS) > 0 {
		services, viaPlayerctl := g.listActiveMPRISServices()
		active := make(map[string]bool, len(services))
		for _, svc := range services {
			active[svc] = true
		}
		for _, svc := range g.state.PausedMPRIS {
			if active[svc] && g.mprisGetStatus(svc, viaPlayerctl) == "Paused" {
				if g.mprisCall(svc, "Play", viaPlayerctl) {
					log.Printf("mediaguard: resumed MPRIS player %s", svc)
				}
			}
		}
	}

	g.state = emptyState()
	g.clearStateFiles()
}
