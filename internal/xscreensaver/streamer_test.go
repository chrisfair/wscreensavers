package xscreensaver

import (
	"fmt"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
	"wscreensavers/internal/models"
)

func TestSessionForPerMonitor(t *testing.T) {
	s := NewStreamer()

	def := s.sessionFor("")
	if def.displayNum != baseDisplayNum || def.key != defaultSessionKey {
		t.Fatalf("default session = %q on :%d", def.key, def.displayNum)
	}

	a := s.sessionFor("DP-1")
	b := s.sessionFor("HDMI-A-1")
	if a == b || a.displayNum == b.displayNum {
		t.Fatalf("monitors must get distinct sessions and displays: :%d vs :%d", a.displayNum, b.displayNum)
	}
	if a.displayNum == def.displayNum || b.displayNum == def.displayNum {
		t.Fatal("monitor session reused the default display")
	}
	if s.sessionFor("DP-1") != a {
		t.Fatal("same monitor must return the same session")
	}
}

func TestNormalizeSize(t *testing.T) {
	cases := []struct{ w, h, maxDim, ew, eh int }{
		{0, 0, 1920, defaultWidth, defaultHeight},
		{-5, 100, 1920, defaultWidth, defaultHeight},
		{1920, 1080, 1920, 1920, 1080},
		{1921, 1081, 1920, 1920, 1080},
		{3840, 2160, 1920, 1920, 1080},
		{2560, 1440, 1920, 1920, 1080},
		{10, 10, 1920, defaultWidth, defaultHeight},
		{2560, 1440, 1280, 1280, 720},
		{2560, 1440, 3840, 2560, 1440},
		{3840, 2160, 3840, 3840, 2160},
		{2560, 1440, 0, 1920, 1080},
		{2560, 1440, 100, 1920, 1080},
		{5000, 2000, 9999, 1920, 768},
	}
	for _, c := range cases {
		gw, gh := normalizeSize(c.w, c.h, c.maxDim)
		if gw != c.ew || gh != c.eh {
			t.Errorf("normalizeSize(%d,%d,%d) = %dx%d, want %dx%d", c.w, c.h, c.maxDim, gw, gh, c.ew, c.eh)
		}
	}
}

func TestStopClientWithoutSession(t *testing.T) {
	s := NewStreamer()
	s.StopClient("DP-1", "c_missing")
	sess := s.sessionFor("DP-1")
	ctx, release := sess.registerClientStream("c_1", t.Context())
	if ctx == nil {
		t.Fatal("expected non-nil stream context")
	}
	_, release2 := sess.registerClientStream("c_1", t.Context())
	release()
	release2()
	_, _ = findFallbackBinary("")
	s.StopAll()
}

func TestServeMJPEGAndRunnerWithFakeBinaries(t *testing.T) {
	tmpDir := t.TempDir()
	tmpBin := filepath.Join(tmpDir, "bin")
	_ = os.MkdirAll(tmpBin, 0755)

	_ = os.WriteFile(filepath.Join(tmpBin, "Xvfb"), []byte("#!/bin/sh\nsleep 10\n"), 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "ffmpeg"), []byte("#!/bin/sh\nprintf '--ffmpeg\\r\\nContent-Type: image/jpeg\\r\\n\\r\\nframe'\nexit 0\n"), 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "hyprctl"), []byte("#!/bin/sh\necho '100, 200'\nexit 0\n"), 0755)
	fakeHack := filepath.Join(tmpBin, "fakehack")
	_ = os.WriteFile(fakeHack, []byte("#!/bin/sh\nsleep 10\n"), 0755)
	shortHack := filepath.Join(tmpBin, "shorthack")
	_ = os.WriteFile(shortHack, []byte("#!/bin/sh\nsleep 0.2\nexit 0\n"), 0755)

	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	s := NewStreamer()
	defer s.StopAll()

	saver := models.Screensaver{
		ID:         "xss_fakehack",
		Name:       "FakeHack",
		BinaryPath: fakeHack,
	}

	req := httptest.NewRequest("GET", "/api/xss-stream?saver=xss_fakehack&client=c1", nil)
	rec := httptest.NewRecorder()
	s.ServeMJPEG(rec, req, saver, nil, 30, "DP-1", 640, 360, 1920)
	if rec.Code != 200 {
		t.Fatalf("expected 200 from ServeMJPEG, got %d: %s", rec.Code, rec.Body.String())
	}

	// Second request reuses running Xvfb and hack process
	req2 := httptest.NewRequest("GET", "/api/xss-stream?saver=xss_fakehack&client=c2", nil)
	rec2 := httptest.NewRecorder()
	s.ServeMJPEG(rec2, req2, saver, nil, 0, "DP-1", 640, 360, 1920)

	s.StopClient("DP-1", "c1")
	s.StopClient("DP-1", "c2")

	// Missing binary error path
	reqErr := httptest.NewRequest("GET", "/api/xss-stream", nil)
	recErr := httptest.NewRecorder()
	s.ServeMJPEG(recErr, reqErr, models.Screensaver{ID: "nobin"}, nil, 15, "DP-2", 0, 0, 0)
	if recErr.Code != 500 {
		t.Errorf("expected 500 for missing BinaryPath, got %d", recErr.Code)
	}

	// Runner & RunBlocking tests
	runner := NewRunner()
	if _, err := runner.Launch(models.Screensaver{ID: "nobin"}, nil, "k1"); err == nil {
		t.Errorf("expected error launching saver without BinaryPath")
	}
	pid, err := runner.Launch(saver, nil, "k1")
	if err != nil || pid <= 0 {
		t.Fatalf("expected Runner.Launch to succeed, got pid=%d err=%v", pid, err)
	}
	runner.Stop("k1")
	runner.StopAll()

	if err := RunBlocking(models.Screensaver{ID: "short", BinaryPath: shortHack}, nil); err != nil {
		t.Errorf("RunBlocking with short-lived binary failed: %v", err)
	}
}

func TestClaimDisplayEvictsOrphanedXvfbAndSkipsLiveOnes(t *testing.T) {
	const want = 9870
	dir := t.TempDir()
	script := filepath.Join(dir, "Xvfb")
	if err := os.WriteFile(script, []byte("#!/bin/sh\nsleep 60\n"), 0755); err != nil {
		t.Fatal(err)
	}

	orphanPidFile := filepath.Join(dir, "orphan.pid")
	launch := fmt.Sprintf("%s :%d >/dev/null 2>&1 & echo $! > %s", script, want, orphanPidFile)
	if err := exec.Command("sh", "-c", launch).Run(); err != nil {
		t.Fatal(err)
	}
	var orphan int
	for i := 0; i < 50 && orphan == 0; i++ {
		time.Sleep(20 * time.Millisecond)
		if data, err := os.ReadFile(orphanPidFile); err == nil {
			orphan, _ = strconv.Atoi(strings.TrimSpace(string(data)))
		}
	}
	if orphan == 0 || findXvfb(want) != orphan {
		t.Fatalf("test setup: expected orphan Xvfb on :%d, got %d (pid file %d)", want, findXvfb(want), orphan)
	}
	if got := claimDisplay(want); got != want {
		t.Errorf("orphaned display should be reclaimed: got :%d, want :%d", got, want)
	}
	if findXvfb(want) != 0 {
		t.Errorf("orphaned Xvfb on :%d was not evicted", want)
	}

	live := exec.Command(script, fmt.Sprintf(":%d", want+1))
	if err := live.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = live.Process.Kill(); _, _ = live.Process.Wait() }()
	time.Sleep(50 * time.Millisecond)
	if got := claimDisplay(want + 1); got != want+2 {
		t.Errorf("live display must be skipped: got :%d, want :%d", got, want+2)
	}
	if err := live.Process.Signal(syscall.Signal(0)); err != nil {
		t.Errorf("live Xvfb was killed: %v", err)
	}
}
