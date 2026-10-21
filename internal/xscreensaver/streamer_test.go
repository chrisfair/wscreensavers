package xscreensaver

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
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
		// unset or out-of-range limits fall back to the default
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
	s.StopClient("DP-1", "c_missing") // must not panic or start anything
	s.StopAll()
}

func TestClaimDisplayEvictsOrphanedXvfbAndSkipsLiveOnes(t *testing.T) {
	const want = 9870
	dir := t.TempDir()
	script := filepath.Join(dir, "Xvfb")
	if err := os.WriteFile(script, []byte("#!/bin/sh\nsleep 60\n"), 0755); err != nil {
		t.Fatal(err)
	}

	// Orphaned: started through a throwaway shell that exits, so its parent is no
	// wscreensavers process.
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

	// Live: a child of this process counts as owned by a live wscreensavers process.
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
