package mediaguard

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"
)

type recordedSignal struct {
	pid int
	sig syscall.Signal
}

func TestEngageEnforceAndRelease(t *testing.T) {
	tmpDir := t.TempDir()
	g := New(tmpDir)

	var (
		mu       sync.Mutex
		cmdCalls []string
		signals  []recordedSignal
	)

	vivaldiStatus := "Playing"
	mpvStatus := "Paused"
	sinkHeadsetMute := false
	sinkHDMIMute := true
	sourceMicMute := false

	g.sleep = func(time.Duration) {}
	g.listProcs = func() []ProcInfo {
		return []ProcInfo{
			{PID: 100, PPID: 1, Comm: "wscreensavers", Argv: []string{"/usr/bin/wscreensavers", "--lock"}, StartTime: "1000"},
			{PID: 101, PPID: 100, Comm: "ffmpeg", Argv: []string{"ffmpeg", "-f", "x11grab", "-i", ":98", "-f", "mpjpeg", "-"}, StartTime: "1005"},
			{PID: 200, PPID: 1, Comm: "aplay", Argv: []string{"aplay", "music.wav"}, StartTime: "2000"},
			{PID: 300, PPID: 1, Comm: "pw-record", Argv: []string{"pw-record", "/tmp/rec.wav"}, StartTime: "3000"},
			{PID: 301, PPID: 1, Comm: "ffmpeg", Argv: []string{"ffmpeg", "-f", "pulse", "-i", "default", "out.wav"}, StartTime: "3010"},
			{PID: 302, PPID: 1, Comm: "ffmpeg", Argv: []string{"ffmpeg", "-i", "in.mp4", "out.mp4"}, StartTime: "3020"},
			{PID: 400, PPID: 1, Comm: "qs", Argv: []string{"qs", "-c", "noctalia-shell"}, StartTime: "4000"},
			{PID: 401, PPID: 1, Comm: "obs", Argv: []string{"obs"}, StartTime: "4010"},
		}
	}
	alive := map[int]bool{300: false, 301: true}
	g.isProcAlive = func(pid int) bool {
		mu.Lock()
		defer mu.Unlock()
		return alive[pid]
	}
	g.procStartTime = func(pid int) string {
		if pid == 200 {
			return "2000"
		}
		return ""
	}
	g.sendSignal = func(pid int, sig syscall.Signal) error {
		mu.Lock()
		defer mu.Unlock()
		signals = append(signals, recordedSignal{pid: pid, sig: sig})
		if sig == syscall.SIGTERM {
			alive[pid] = false
		}
		return nil
	}
	g.runCmd = func(_ time.Duration, name string, args ...string) (string, error) {
		mu.Lock()
		defer mu.Unlock()
		full := strings.TrimSpace(name + " " + strings.Join(args, " "))
		cmdCalls = append(cmdCalls, full)

		switch {
		case full == "busctl --user list --no-pager --no-legend":
			return strings.Join([]string{
				"org.mpris.MediaPlayer2.playerctld - - - (activatable) - -",
				"org.mpris.MediaPlayer2.vivaldi.instance1 500 christopher :1.40 vivaldi - -",
				"org.mpris.MediaPlayer2.mpv 501 christopher :1.41 mpv - -",
			}, "\n"), nil
		case strings.HasPrefix(full, "busctl --user get-property org.mpris.MediaPlayer2.vivaldi.instance1"):
			return `s "` + vivaldiStatus + `"`, nil
		case strings.HasPrefix(full, "busctl --user get-property org.mpris.MediaPlayer2.mpv"):
			return `s "` + mpvStatus + `"`, nil
		case full == "busctl --user call org.mpris.MediaPlayer2.vivaldi.instance1 /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player Pause":
			vivaldiStatus = "Paused"
			return "", nil
		case full == "busctl --user call org.mpris.MediaPlayer2.vivaldi.instance1 /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player Play":
			vivaldiStatus = "Playing"
			return "", nil
		case full == "pactl -f json list sink-inputs":
			return `[{"index":42,"mute":false,"corked":false,"properties":{"application.process.id":"200"}}]`, nil
		case full == "pactl -f json list sinks":
			b, _ := json.Marshal([]pactlDevice{
				{Index: 1, Name: "sink.headset", Mute: sinkHeadsetMute},
				{Index: 2, Name: "sink.hdmi", Mute: sinkHDMIMute},
			})
			return string(b), nil
		case full == "pactl -f json list sources":
			b, _ := json.Marshal([]pactlDevice{
				{Index: 10, Name: "source.mic", Mute: sourceMicMute},
			})
			return string(b), nil
		case full == "pactl -f json list source-outputs":
			return `[{"index":77,"mute":false}]`, nil
		case full == "pactl set-sink-mute sink.headset 1":
			sinkHeadsetMute = true
			return "", nil
		case full == "pactl set-sink-mute sink.headset 0":
			sinkHeadsetMute = false
			return "", nil
		case full == "pactl set-sink-mute sink.hdmi 1":
			sinkHDMIMute = true
			return "", nil
		case full == "pactl set-source-mute source.mic 1":
			sourceMicMute = true
			return "", nil
		case full == "pactl set-source-mute source.mic 0":
			sourceMicMute = false
			return "", nil
		case full == "pw-dump":
			return `[
				{"id":88,"info":{"props":{"media.class":"Stream/Input/Audio","media.name":"Peak detect"}}},
				{"id":89,"info":{"props":{"media.class":"Stream/Input/Audio","media.name":"RecordStream","application.name":"Browser"}}},
				{"id":90,"info":{"props":{"media.class":"Stream/Input/Video","media.name":"WebcamCapture"}}}
			]`, nil
		default:
			return "", nil
		}
	}

	g.Engage(true, true)

	if !HasActiveState(tmpDir) {
		t.Fatalf("expected persisted state file in %s", tmpDir)
	}
	if vivaldiStatus != "Paused" {
		t.Fatalf("expected vivaldi to be paused, got %q", vivaldiStatus)
	}
	if !sinkHeadsetMute || !sinkHDMIMute || !sourceMicMute {
		t.Fatalf("expected all sinks and sources muted while locked")
	}

	// Verify wscreensavers child ffmpeg (pid 101) and transcode ffmpeg (pid 302) were NEVER signaled.
	var got200Stop, got300Int, got301Int, got301Term bool
	for _, s := range signals {
		if s.pid == 101 || s.pid == 302 || s.pid == 100 {
			t.Fatalf("unexpected signal %v to protected process pid=%d", s.sig, s.pid)
		}
		if s.pid == 200 && s.sig == syscall.SIGSTOP {
			got200Stop = true
		}
		if s.pid == 300 && s.sig == syscall.SIGINT {
			got300Int = true
		}
		if s.pid == 301 && s.sig == syscall.SIGINT {
			got301Int = true
		}
		if s.pid == 301 && s.sig == syscall.SIGTERM {
			got301Term = true
		}
	}
	if !got200Stop || !got300Int || !got301Int || !got301Term {
		t.Fatalf("missing expected process signals: %+v", signals)
	}

	// Verify pw-cli destroy ran for nodes 89 & 90, NOT 88 (Peak detect).
	var destroyed88, destroyed89, destroyed90 bool
	for _, c := range cmdCalls {
		switch c {
		case "pw-cli destroy 88":
			destroyed88 = true
		case "pw-cli destroy 89":
			destroyed89 = true
		case "pw-cli destroy 90":
			destroyed90 = true
		}
	}
	if destroyed88 || !destroyed89 || !destroyed90 {
		t.Fatalf("unexpected pw-cli destroy behavior: 88=%v 89=%v 90=%v", destroyed88, destroyed89, destroyed90)
	}

	// Simulate an app unmuting sink.headset while locked -> Enforce should re-mute it.
	sinkHeadsetMute = false
	sourceMicMute = false
	vivaldiStatus = "Playing"
	g.Enforce(true, true)
	if !sinkHeadsetMute || !sourceMicMute || vivaldiStatus != "Paused" {
		t.Fatalf("expected Enforce to re-mute sink/source and pause playback")
	}

	// Unlock -> sink.headset should unmute, sink.hdmi (was muted before lock!) should remain muted,
	// source.mic should unmute, vivaldi should resume, mpv (was already paused!) must stay paused,
	// and CLI player pid 200 should receive SIGCONT.
	g.Release()

	if sinkHeadsetMute {
		t.Fatalf("expected sink.headset to be restored to unmuted")
	}
	if !sinkHDMIMute {
		t.Fatalf("expected pre-muted sink.hdmi to stay muted")
	}
	if sourceMicMute {
		t.Fatalf("expected source.mic to be restored to unmuted")
	}
	if vivaldiStatus != "Playing" {
		t.Fatalf("expected vivaldi to resume playing, got %q", vivaldiStatus)
	}
	if mpvStatus != "Paused" {
		t.Fatalf("expected mpv (already paused before lock) to stay paused")
	}
	if HasActiveState(tmpDir) {
		t.Fatalf("expected state file to be removed on Release")
	}

	var got200Cont bool
	for _, s := range signals {
		if s.pid == 200 && s.sig == syscall.SIGCONT {
			got200Cont = true
		}
	}
	if !got200Cont {
		t.Fatalf("expected SIGCONT on pid 200")
	}
}

func TestPlayerctlFallbackAndRecoverIfUnlocked(t *testing.T) {
	tmpDir := t.TempDir()
	// Write a legacy state file to verify seamless migration/recovery
	legacyPath := filepath.Join(tmpDir, LegacyStateFileName)
	legacy := GuardState{
		Source:      "lock",
		LockedAt:    float64(time.Now().Add(-10 * time.Second).Unix()),
		PausedMPRIS: []string{"firefox"},
		SinkMutes:   map[string]bool{"sink.usb": false},
		SourceMutes: map[string]bool{"source.usb": false},
	}
	raw, _ := json.Marshal(legacy)
	if err := os.WriteFile(legacyPath, raw, 0600); err != nil {
		t.Fatal(err)
	}
	if !HasActiveState(tmpDir) {
		t.Fatalf("expected HasActiveState to detect legacy state file")
	}

	g := New(tmpDir)
	g.sleep = func(time.Duration) {}
	resumed := false
	g.runCmd = func(_ time.Duration, name string, args ...string) (string, error) {
		if name == "busctl" {
			return "", errors.New("busctl unavailable")
		}
		full := name + " " + strings.Join(args, " ")
		switch full {
		case "pactl -f json list sinks":
			return `[{"index":1,"name":"sink.usb","mute":true}]`, nil
		case "pactl -f json list sources":
			return `[{"index":2,"name":"source.usb","mute":true}]`, nil
		case "playerctl -l":
			return "playerctld\nfirefox\n", nil
		case "playerctl -p firefox status":
			return "Paused\n", nil
		case "playerctl -p firefox play":
			resumed = true
			return "", nil
		default:
			return "", nil
		}
	}

	g.Release()
	if !resumed {
		t.Fatalf("expected playerctl fallback to resume firefox")
	}
	if HasActiveState(tmpDir) {
		t.Fatalf("expected legacy state file to be cleaned up")
	}
}

func TestWatchLoopIgnoresClientEventsAndDebouncesSinkEvents(t *testing.T) {
	tmpDir := t.TempDir()
	g := New(tmpDir)
	g.engaged = true
	g.engagedAt = time.Now()

	pr, pw := io.Pipe()
	g.startSub = func(_ context.Context) (io.ReadCloser, func(), error) {
		return pr, func() { _ = pr.Close() }, nil
	}

	var mu sync.Mutex
	enforceCount := 0
	g.runCmd = func(_ time.Duration, name string, args ...string) (string, error) {
		mu.Lock()
		defer mu.Unlock()
		if len(args) >= 4 && args[2] == "list" && args[3] == "sinks" {
			enforceCount++
		}
		return "[]", nil
	}
	g.listProcs = func() []ProcInfo { return nil }

	stop := g.StartWatchLoop(true, false)
	defer stop()

	// Client events must never trigger Enforce
	_, _ = pw.Write([]byte("Event 'new' on client #55\nEvent 'remove' on client #55\n"))
	time.Sleep(500 * time.Millisecond)
	mu.Lock()
	if enforceCount != 0 {
		mu.Unlock()
		t.Fatalf("expected 0 enforce calls for client events, got %d", enforceCount)
	}
	mu.Unlock()

	// Sink event must trigger Enforce after debounce
	_, _ = pw.Write([]byte("Event 'change' on sink #1\nEvent 'change' on sink #1\n"))
	deadline := time.Now().Add(1500 * time.Millisecond)
	for time.Now().Before(deadline) {
		mu.Lock()
		c := enforceCount
		mu.Unlock()
		if c >= 1 {
			break
		}
		time.Sleep(30 * time.Millisecond)
	}
	mu.Lock()
	got := enforceCount
	mu.Unlock()
	if got != 1 {
		t.Fatalf("expected debounced 1 enforce call, got %d", got)
	}
}

func TestProcClassificationHelpers(t *testing.T) {
	ppid, st, ok := parseProcStat("1234 (weird (comm) name) S 999 1234 1234 0 -1 4194304 100 0 0 0 10 5 0 0 20 0 1 0 98765432 1000 100")
	if !ok || ppid != 999 || st != "98765432" {
		t.Fatalf("unexpected parseProcStat result: ok=%v ppid=%d st=%q", ok, ppid, st)
	}
	if _, _, ok := parseProcStat("malformed"); ok {
		t.Fatalf("expected malformed stat to return ok=false")
	}

	byPID := map[int]ProcInfo{
		10: {PID: 10, PPID: 1, Comm: "wscreensavers", Argv: []string{"wscreensavers", "--lock"}},
		11: {PID: 11, PPID: 10, Comm: "sh", Argv: []string{"sh"}},
		12: {PID: 12, PPID: 11, Comm: "ffmpeg", Argv: []string{"ffmpeg", "-f", "x11grab", "-i", ":99", "out.mp4"}},
		20: {PID: 20, PPID: 1, Comm: "pw-cat", Argv: []string{"pw-cat", "--record", "mic.wav"}},
		21: {PID: 21, PPID: 1, Comm: "pw-cat", Argv: []string{"pw-cat", "--playback", "song.wav"}},
		22: {PID: 22, PPID: 1, Comm: "rec", Argv: []string{"rec", "voice.flac"}},
		23: {PID: 23, PPID: 1, Comm: "ffmpeg", Argv: []string{"ffmpeg", "-i", "/dev/video0", "cam.mkv"}},
	}

	if isRecorderProcess(byPID[12], byPID) {
		t.Fatalf("descendant of wscreensavers must never be classified as a user recorder")
	}
	if !isRecorderProcess(byPID[20], byPID) {
		t.Fatalf("pw-cat --record should be classified as a recorder")
	}
	if isRecorderProcess(byPID[21], byPID) {
		t.Fatalf("pw-cat --playback must not be classified as a recorder")
	}
	if !isRecorderProcess(byPID[22], byPID) {
		t.Fatalf("sox rec should be classified as a recorder")
	}
	if !isRecorderProcess(byPID[23], byPID) {
		t.Fatalf("ffmpeg /dev/video0 should be classified as a recorder")
	}

	if !isExternalLockerInProcs([]ProcInfo{{PID: 50, Comm: "hyprlock"}}) {
		t.Fatalf("expected hyprlock to be recognized as external locker")
	}
	if isExternalLockerInProcs([]ProcInfo{{PID: 51, Comm: "bash"}}) {
		t.Fatalf("unexpected external locker match")
	}

	// Read-only sanity check on real /proc helpers
	_ = scanUserProcs(os.Getuid(), -1)
	if readProcStartTime(os.Getpid()) == "" {
		t.Fatalf("expected non-empty starttime for current process")
	}
}

func TestNoOpAndRecoveryPaths(t *testing.T) {
	tmpDir := t.TempDir()
	g := New(tmpDir)
	g.Engage(false, false)
	g.Enforce(false, false)
	stop := g.StartWatchLoop(false, false)
	stop()
	g.Release()

	if RecoverIfUnlocked(tmpDir) {
		t.Fatalf("expected RecoverIfUnlocked=false when no state file exists")
	}

	// Write recent "ctl" state -> RecoverIfUnlocked should leave it intact
	ctlState := GuardState{
		Source:   "ctl",
		LockedAt: float64(time.Now().Unix()),
	}
	raw, _ := json.Marshal(ctlState)
	if err := os.WriteFile(filepath.Join(tmpDir, StateFileName), raw, 0600); err != nil {
		t.Fatal(err)
	}
	if RecoverIfUnlocked(tmpDir) {
		t.Fatalf("expected RecoverIfUnlocked=false for recent ctl state")
	}

	// Write "lock" state with empty maps -> RecoverIfUnlocked cleans it up safely without calling pactl
	lockState := GuardState{
		Source:   "lock",
		LockedAt: float64(time.Now().Add(-5 * time.Second).Unix()),
	}
	raw2, _ := json.Marshal(lockState)
	if err := os.WriteFile(filepath.Join(tmpDir, StateFileName), raw2, 0600); err != nil {
		t.Fatal(err)
	}
	if !RecoverIfUnlocked(tmpDir) {
		t.Fatalf("expected RecoverIfUnlocked=true for stale lock state")
	}
	if HasActiveState(tmpDir) {
		t.Fatalf("expected stale lock state to be removed")
	}

	if out, err := defaultRunCmd(time.Second, "echo", "hello"); err != nil || strings.TrimSpace(out) != "hello" {
		t.Fatalf("unexpected defaultRunCmd result: out=%q err=%v", out, err)
	}
	if RuntimeDir() == "" {
		t.Fatalf("expected non-empty RuntimeDir")
	}
}

