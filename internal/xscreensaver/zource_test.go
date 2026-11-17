package xscreensaver

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func setupFakeZourceEnv(t *testing.T) (binPath string, restore func()) {
	t.Helper()
	tmp := t.TempDir()
	binDir := filepath.Join(tmp, "bin")
	if err := os.MkdirAll(binDir, 0755); err != nil {
		t.Fatal(err)
	}
	binPath = filepath.Join(binDir, "zource")
	script := "#!/bin/sh\nprintf 'P6\\n2 2\\n255\\n\\0\\0\\0\\0\\0\\0\\0\\0\\0\\0\\0\\0'\nexit 0\n"
	if err := os.WriteFile(binPath, []byte(script), 0755); err != nil {
		t.Fatal(err)
	}

	origZourceBins := DefaultZourceBinaryPaths
	origZourceLook := zourceLookPath
	origCelBins := DefaultCelestiaBinaryPaths
	origCelDirs := DefaultCelestiaDataDirs
	origCelLook := celestiaLookPath

	DefaultZourceBinaryPaths = []string{binPath}
	zourceLookPath = nil
	DefaultCelestiaBinaryPaths = []string{filepath.Join(tmp, "missing-celestia")}
	DefaultCelestiaDataDirs = []string{filepath.Join(tmp, "missing-celestia-data")}
	celestiaLookPath = nil

	return binPath, func() {
		DefaultZourceBinaryPaths = origZourceBins
		zourceLookPath = origZourceLook
		DefaultCelestiaBinaryPaths = origCelBins
		DefaultCelestiaDataDirs = origCelDirs
		celestiaLookPath = origCelLook
	}
}

func TestDiscoverZourceAndExternalEngines(t *testing.T) {
	binPath, restore := setupFakeZourceEnv(t)
	defer restore()

	sv := DiscoverZourceSaver()
	if sv == nil {
		t.Fatal("expected DiscoverZourceSaver to return non-nil saver")
	}
	if sv.ID != ZourceGitSaverID || sv.Engine != "zource" || sv.BinaryPath != binPath {
		t.Fatalf("unexpected Zource saver metadata: %+v", sv)
	}
	if !IsZourceSaver(*sv) {
		t.Fatal("expected IsZourceSaver to report true")
	}

	ext := DiscoverExternalEngines()
	if len(ext) != 1 || ext[0].ID != ZourceGitSaverID {
		t.Fatalf("expected [xss_zource_git] from DiscoverExternalEngines, got %+v", ext)
	}

	// Verify LookPath fallback when DefaultZourceBinaryPaths misses
	DefaultZourceBinaryPaths = []string{filepath.Join(t.TempDir(), "none")}
	zourceLookPath = func(file string) (string, error) {
		return binPath, nil
	}
	if DiscoverZourceSaver() == nil {
		t.Fatal("expected DiscoverZourceSaver to succeed via LookPath fallback")
	}

	// Missing binary returns nil cleanly
	zourceLookPath = nil
	if DiscoverZourceSaver() != nil {
		t.Fatal("expected nil when zource binary is absent")
	}
}

func TestPrepareZourceSessionsAndRepoModes(t *testing.T) {
	_, restore := setupFakeZourceEnv(t)
	defer restore()

	// 1. Default embedded git/git self-hosting log
	_, args, tempDir, err := PrepareZourceStreamSession("", 1280, 720, 20, nil)
	if err != nil {
		t.Fatalf("PrepareZourceStreamSession default failed: %v", err)
	}
	defer os.RemoveAll(tempDir)

	joined := strings.Join(args, " ")
	if !strings.Contains(joined, "--3d") || !strings.Contains(joined, "--output-ppm -") || !strings.Contains(joined, "--log ") {
		t.Fatalf("unexpected default stream args: %v", args)
	}
	logPath := args[len(args)-1]
	if filepath.Base(logPath) != "git" {
		t.Fatalf("expected extracted log file to be named 'git' for root sphere title, got %s", logPath)
	}
	rawLog, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed reading materialized git log: %v", err)
	}
	if !strings.HasPrefix(string(rawLog), "1112911993|Linus Torvalds|") {
		t.Fatalf("expected embedded log to start with Linus Torvalds initial git commit, got prefix: %.60s", string(rawLog))
	}

	// 2. 2D mode, disabled toggles, and custom local Git/Mercurial repositories
	gitRepo := filepath.Join(t.TempDir(), "sample-git")
	if err := os.MkdirAll(filepath.Join(gitRepo, ".git"), 0755); err != nil {
		t.Fatal(err)
	}
	subDir := filepath.Join(gitRepo, "src", "core")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatal(err)
	}

	valsCustom := map[string]any{
		"viewMode":      "2d",
		"repoSource":    "custom_repo",
		"repoPath":      subDir,
		"secondsPerDay": 0.45,
		"autoOrbit":     false,
		"showLabels":    false,
		"enableBloom":   false,
	}
	_, customArgs, customTmp, err := PrepareZourceWaylandSession("", 0, 0, valsCustom)
	if err != nil {
		t.Fatalf("PrepareZourceWaylandSession custom_repo failed: %v", err)
	}
	if customTmp != "" {
		t.Fatalf("expected empty tempDir for valid local git repo, got %s", customTmp)
	}
	customJoined := strings.Join(customArgs, " ")
	for _, want := range []string{"--wayland", "--2d", "--no-orbit", "--no-labels", "--no-bloom", subDir} {
		if !strings.Contains(customJoined, want) {
			t.Fatalf("expected %q in wayland args %v", want, customArgs)
		}
	}

	// Mercurial (.hg) detection and ~ expansion check
	hgRepo := filepath.Join(t.TempDir(), "sample-hg")
	if err := os.MkdirAll(filepath.Join(hgRepo, ".hg"), 0755); err != nil {
		t.Fatal(err)
	}
	if !hasLocalVCSRepo(hgRepo) {
		t.Fatal("expected hasLocalVCSRepo to detect .hg repository")
	}
	if expandUserRepoPath("~/repo") == "~/repo" {
		t.Fatal("expected expandUserRepoPath to expand ~/ prefix")
	}

	// Invalid custom_repo path falls back safely to embedded git/git log instead of failing
	_, fbArgs, fbTmp, err := PrepareZourceStreamSession("", 0, 0, 0, map[string]any{
		"repoSource": "custom_repo",
		"repoPath":   filepath.Join(t.TempDir(), "does-not-exist"),
	})
	if err != nil {
		t.Fatalf("expected fallback to embedded log on invalid custom repo, got err: %v", err)
	}
	defer os.RemoveAll(fbTmp)
	if fbTmp == "" || !strings.Contains(strings.Join(fbArgs, " "), "--log ") {
		t.Fatalf("expected embedded --log fallback args, got %v", fbArgs)
	}
}

func TestStreamerAndRunnerWithZourceSaver(t *testing.T) {
	_, restore := setupFakeZourceEnv(t)
	defer restore()

	tmpBin := filepath.Join(t.TempDir(), "bin")
	_ = os.MkdirAll(tmpBin, 0755)
	// Fake ffmpeg consumes stdin (zource PPM) and emits one MJPEG frame
	_ = os.WriteFile(filepath.Join(tmpBin, "ffmpeg"), []byte("#!/bin/sh\ncat >/dev/null\nprintf -- '--ffmpeg\\r\\nContent-Type: image/jpeg\\r\\n\\r\\nzframe'\nexit 0\n"), 0755)
	_ = os.WriteFile(filepath.Join(tmpBin, "hyprctl"), []byte("#!/bin/sh\necho '50, 50'\nexit 0\n"), 0755)

	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	sv := DiscoverZourceSaver()
	if sv == nil {
		t.Fatal("expected DiscoverZourceSaver to succeed")
	}

	s := NewStreamer()
	defer s.StopAll()

	req := httptest.NewRequest("GET", "/api/xss-stream?saver=xss_zource_git&client=z1", nil)
	rec := httptest.NewRecorder()
	s.ServeMJPEG(rec, req, *sv, map[string]any{"viewMode": "3d"}, 18, "DP-2", 640, 360, 1920)
	if rec.Code != 200 {
		t.Fatalf("expected 200 streaming Zource saver, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "zframe") {
		t.Fatalf("expected MJPEG payload from zource->ffmpeg pipeline, got %q", rec.Body.String())
	}
	s.StopClient("DP-2", "z1")

	runner := NewRunner()
	// Replace fake zource with a brief sleep so Runner.Launch sees a live PID before Stop
	_ = os.WriteFile(sv.BinaryPath, []byte("#!/bin/sh\nsleep 5\n"), 0755)
	pid, err := runner.Launch(*sv, map[string]any{"viewMode": "3d"}, "zrun1")
	if err != nil || pid <= 0 {
		t.Fatalf("expected Runner.Launch for Zource to succeed, got pid=%d err=%v", pid, err)
	}
	runner.mu.Lock()
	activeTmp := runner.tempDirs["zrun1"]
	runner.mu.Unlock()
	if activeTmp == "" {
		t.Fatal("expected Runner tempDir to be populated for embedded git log")
	}
	runner.Stop("zrun1")
	if _, err := os.Stat(activeTmp); !os.IsNotExist(err) {
		t.Fatalf("expected Runner tempDir %s to be cleaned up on Stop", activeTmp)
	}
}
