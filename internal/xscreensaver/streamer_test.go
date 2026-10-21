package xscreensaver

import "testing"

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
