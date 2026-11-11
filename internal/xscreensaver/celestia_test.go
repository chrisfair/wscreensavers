package xscreensaver

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func setupFakeCelestiaEnv(t *testing.T) (binPath, dataDir string, restore func()) {
	t.Helper()
	tmp := t.TempDir()
	binDir := filepath.Join(tmp, "bin")
	dataDir = filepath.Join(tmp, "share", "celestia")
	if err := os.MkdirAll(binDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dataDir, "textures"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dataDir, "data"), 0755); err != nil {
		t.Fatal(err)
	}

	binPath = filepath.Join(binDir, "celestia")
	if err := os.WriteFile(binPath, []byte("#!/bin/sh\nsleep 10\n"), 0755); err != nil {
		t.Fatal(err)
	}

	baseCfg := `Configuration
{
  InitScript  "start.cel"
  LogoTexture  "logo.png"
  OrbitPathSamplePoints  100
  RingSystemSections     100
  ShadowTextureSize      256
  EclipseTextureSize     128
# AntialiasingSamples        4
}
`
	if err := os.WriteFile(filepath.Join(dataDir, "celestia.cfg"), []byte(baseCfg), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dataDir, "celestiaui.xml"), []byte("<ui><menubar/></ui>\n"), 0644); err != nil {
		t.Fatal(err)
	}

	origBins := DefaultCelestiaBinaryPaths
	origDirs := DefaultCelestiaDataDirs
	DefaultCelestiaBinaryPaths = []string{binPath}
	DefaultCelestiaDataDirs = []string{dataDir}

	return binPath, dataDir, func() {
		DefaultCelestiaBinaryPaths = origBins
		DefaultCelestiaDataDirs = origDirs
	}
}

func TestDiscoverCelestiaAndExternalEngines(t *testing.T) {
	binPath, _, restore := setupFakeCelestiaEnv(t)
	defer restore()

	sv := DiscoverCelestiaSaver()
	if sv == nil {
		t.Fatal("expected DiscoverCelestiaSaver to return non-nil saver")
	}
	if sv.ID != CelestiaTourSaverID || sv.Engine != "celestia" || sv.BinaryPath != binPath {
		t.Fatalf("unexpected Celestia saver metadata: %+v", sv)
	}
	if !IsCelestiaTourSaver(*sv) {
		t.Fatal("expected IsCelestiaTourSaver to report true")
	}
	if len(DiscoverExternalEngines()) != 1 {
		t.Fatalf("expected 1 external engine, got %d", len(DiscoverExternalEngines()))
	}

	// Missing data directory returns nil cleanly.
	DefaultCelestiaDataDirs = []string{filepath.Join(t.TempDir(), "missing")}
	if DiscoverCelestiaSaver() != nil {
		t.Fatal("expected nil when celestia data directory is missing")
	}
	if len(DiscoverExternalEngines()) != 0 {
		t.Fatal("expected empty slice when celestia is unavailable")
	}
}

func TestPrepareCelestiaSessionRoutesAndConfigs(t *testing.T) {
	_, _, restore := setupFakeCelestiaEnv(t)
	defer restore()

	routes := []string{
		"grand_tour",
		"randomized",
		"planets_only",
		"giants_moons",
		"earth_orbital",
		"small_worlds",
	}
	hudModes := []string{"terse", "verbose", "captions", "none"}

	for i, route := range routes {
		hud := hudModes[i%len(hudModes)]
		vals := map[string]any{
			"route":           route,
			"dwellSeconds":    int(10),
			"travelSeconds":   float32(3.5),
			"hudMode":         hud,
			"ambientLight":    float64(0.18),
			"showOrbits":      i%2 == 0,
			"showLabels":      i%2 == 1,
			"staggerMonitors": true,
		}
		keyA := CelestiaConfigKey(1280, 720, vals)
		keyB := CelestiaConfigKey(1920, 1080, vals)
		if keyA == keyB {
			t.Fatal("expected different CelestiaConfigKey for different dimensions")
		}

		_, args, extraEnv, tempDir, err := PrepareCelestiaSession("DP-1", 190+i, 1280, 720, vals)
		if err != nil {
			t.Fatalf("PrepareCelestiaSession(%s) failed: %v", route, err)
		}
		defer os.RemoveAll(tempDir)

		if len(args) != 5 || args[0] != "-s" || args[1] != "-d" || args[3] != "-c" {
			t.Fatalf("unexpected celestia args: %v", args)
		}

		merged := mergeEnv([]string{"DISPLAY=:99", "HOME=/old", "LP_NUM_THREADS=1"}, extraEnv)
		mergedJoined := strings.Join(merged, "\n")
		if strings.Contains(mergedJoined, "HOME=/old") || !strings.Contains(mergedJoined, "LP_NUM_THREADS=2") {
			t.Fatalf("mergeEnv did not override HOME and LP_NUM_THREADS: %v", merged)
		}

		rootDir := args[2]
		uiXML, err := os.ReadFile(filepath.Join(rootDir, "celestiaui.xml"))
		if err != nil || strings.TrimSpace(string(uiXML)) != "<ui/>" {
			t.Fatalf("expected borderless <ui/> celestiaui.xml, got %q (err=%v)", string(uiXML), err)
		}

		rewrittenCfg, err := os.ReadFile(filepath.Join(rootDir, "celestia.cfg"))
		if err != nil || !strings.Contains(string(rewrittenCfg), `InitScript  "tour.cel"`) {
			t.Fatalf("expected InitScript tour.cel in celestia.cfg, got %q", string(rewrittenCfg))
		}

		rcData, err := os.ReadFile(filepath.Join(tempDir, "home", ".celestiarc"))
		if err != nil || !strings.Contains(string(rcData), "width=1280\nheight=720\nx=0\ny=0") {
			t.Fatalf("expected exact 1280x720 geometry in .celestiarc, got %q", string(rcData))
		}

		tourData, err := os.ReadFile(filepath.Join(rootDir, "tour.cel"))
		if err != nil {
			t.Fatalf("missing tour.cel: %v", err)
		}
		tourStr := string(tourData)
		if !strings.Contains(tourStr, "timerate { rate 1728000.0 }") {
			t.Fatal("expected heliocentric time-lapse overview in tour.cel")
		}
		if hud == "none" && strings.Contains(tourStr, "print { text") {
			t.Fatal("expected zero print captions when hudMode == none")
		}
		if hud != "none" && !strings.Contains(tourStr, "print { text") {
			t.Fatalf("expected print captions when hudMode == %s", hud)
		}
	}

	// Verify int64 numeric conversion and multi-monitor stagger determinism.
	valsInt64 := map[string]any{"dwellSeconds": int64(12)}
	if parsed := parseCelestiaSettings(valsInt64); parsed.DwellSeconds != 12 {
		t.Fatalf("expected int64 dwellSeconds=12, got %v", parsed.DwellSeconds)
	}
	if sessionOffset("DP-1", 31) == sessionOffset("default", 31) && sessionOffset("HDMI-A-1", 31) == 0 {
		t.Fatal("expected non-zero stagger offset for multi-monitor session keys")
	}
}

func TestStreamerAndRunnerWithCelestiaSaver(t *testing.T) {
	_, _, restore := setupFakeCelestiaEnv(t)
	defer restore()

	tmpBin := filepath.Join(t.TempDir(), "bin")
	_ = os.MkdirAll(tmpBin, 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "Xvfb"), []byte("#!/bin/sh\nsleep 10\n"), 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "ffmpeg"), []byte("#!/bin/sh\nprintf '--ffmpeg\\r\\nContent-Type: image/jpeg\\r\\n\\r\\nframe'\nexit 0\n"), 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "hyprctl"), []byte("#!/bin/sh\necho '50, 50'\nexit 0\n"), 0755)

	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	sv := DiscoverCelestiaSaver()
	if sv == nil {
		t.Fatal("expected DiscoverCelestiaSaver to succeed")
	}

	s := NewStreamer()
	defer s.StopAll()

	req := httptest.NewRequest("GET", "/api/xss-stream?saver=xss_celestia_tour&client=c1", nil)
	rec := httptest.NewRecorder()
	s.ServeMJPEG(rec, req, *sv, map[string]any{"route": "planets_only"}, 20, "DP-1", 800, 450, 1920)
	if rec.Code != 200 {
		t.Fatalf("expected 200 streaming Celestia saver, got %d: %s", rec.Code, rec.Body.String())
	}

	sess := s.sessionFor("DP-1")
	sess.mu.Lock()
	activeTmp := sess.tempDir
	sess.mu.Unlock()
	if activeTmp == "" {
		t.Fatal("expected session tempDir to be populated while Celestia is running")
	}

	s.StopClient("DP-1", "c1")
	if _, err := os.Stat(activeTmp); !os.IsNotExist(err) {
		t.Fatalf("expected Celestia session tempDir %s to be removed on StopClient", activeTmp)
	}

	runner := NewRunner()
	pid, err := runner.Launch(*sv, map[string]any{"route": "earth_orbital"}, "cel1")
	if err != nil || pid <= 0 {
		t.Fatalf("expected Runner.Launch for Celestia to succeed, got pid=%d err=%v", pid, err)
	}
	runner.Stop("cel1")
}
