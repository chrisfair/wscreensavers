package xscreensaver

import (
	"bytes"
	"compress/gzip"
	_ "embed"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"
	"wscreensavers/internal/models"
)

//go:embed git_selfhost_log.gz
var embeddedGitSelfHostLogGz []byte

const ZourceGitSaverID = "xss_zource_git"

var (
	// DefaultZourceBinaryPaths lists candidate locations for the native zource executable.
	DefaultZourceBinaryPaths = []string{
		"/usr/bin/zource",
		"/usr/local/bin/zource",
	}
	zourceLookPath  = exec.LookPath
	zourceSessionID uint64
)

func findZourceBinary() string {
	for _, p := range DefaultZourceBinaryPaths {
		if info, err := os.Stat(p); err == nil && !info.IsDir() && (info.Mode()&0111 != 0) {
			return p
		}
	}
	if zourceLookPath != nil {
		if p, err := zourceLookPath("zource"); err == nil && p != "" {
			return p
		}
	}
	return ""
}

// IsZourceSaver reports whether saver uses the external Zig zource engine.
func IsZourceSaver(saver models.Screensaver) bool {
	return saver.ID == ZourceGitSaverID || saver.Engine == "zource"
}

// DiscoverZourceSaver returns a catalog entry for the native Zig zource engine when installed.
func DiscoverZourceSaver() *models.Screensaver {
	binPath := findZourceBinary()
	if binPath == "" {
		return nil
	}

	return &models.Screensaver{
		ID:          ZourceGitSaverID,
		Name:        "Zource Engine (Zig): Git Self-Hosting",
		Category:    "Matrix & Cyber",
		Source:      models.SourceXScreenSaver,
		Engine:      "zource",
		Author:      "Christopher Patrick Fair (2026)",
		Year:        "2026",
		BinaryPath:  binPath,
		BaseArgs:    []string{"--3d", "--loop"},
		AccentColor: "#f97316",
		PreviewGrad: "linear-gradient(135deg, #070b15 0%, #c2410c 55%, #38bdf8 100%)",
		Tags:        []string{"Zource", "Git", "Zig", "3D", "Tree", "Linus", "History"},
		Description: "Runs the native Zig zource v0.1.4 engine replaying Git's own 2005–2026 self-hosting commit log (or any local Git/Mercurial repository path) in 3D file-count-driven faceted polyhedron directory shells or 2D radial trees.",
		Installed:   true,
		Params: []models.SaverParam{
			{
				ID:      "viewMode",
				Label:   "Zource Projection Mode",
				Type:    models.ParamSelect,
				Default: "3d",
				Options: []models.SelectOption{
					{ID: "3d", Value: "3d", Label: "3D Rotating Faceted Polyhedra"},
					{ID: "2d", Value: "2d", Label: "2D Classic Radial Directory Tree"},
				},
			},
			{
				ID:      "repoSource",
				Label:   "Repository History Source",
				Type:    models.ParamSelect,
				Default: "git_self_host",
				Options: []models.SelectOption{
					{ID: "git_self_host", Value: "git_self_host", Label: "Built-in git/git Self-Hosting Log (2005–2026)"},
					{ID: "custom_repo", Value: "custom_repo", Label: "Local Git / Mercurial Repository Path"},
				},
			},
			{
				ID:      "repoPath",
				Label:   "Local Git / Mercurial Repository Path (Optional)",
				Type:    models.ParamString,
				Default: "",
			},
			{
				ID:        "secondsPerDay",
				Label:     "Seconds Per Repository Day",
				Type:      models.ParamRange,
				Default:   0.18,
				Min:       0.04,
				Max:       2.0,
				Step:      0.04,
				LowLabel:  "Fast",
				HighLabel: "Slow",
			},
			{
				ID:      "autoOrbit",
				Label:   "Automatic 3D Camera Orbit",
				Type:    models.ParamBoolean,
				Default: true,
			},
			{
				ID:      "showLabels",
				Label:   "Show Directory & Contributor Labels",
				Type:    models.ParamBoolean,
				Default: true,
			},
			{
				ID:      "enableBloom",
				Label:   "Radial Sphere Bloom Halos",
				Type:    models.ParamBoolean,
				Default: true,
			},
		},
	}
}

type zourceSettings struct {
	ViewMode      string
	RepoSource    string
	RepoPath      string
	SecondsPerDay float64
	AutoOrbit     bool
	ShowLabels    bool
	EnableBloom   bool
}

func parseZourceSettings(values map[string]any) zourceSettings {
	cfg := zourceSettings{
		ViewMode:      "3d",
		RepoSource:    "git_self_host",
		RepoPath:      "",
		SecondsPerDay: 0.18,
		AutoOrbit:     true,
		ShowLabels:    true,
		EnableBloom:   true,
	}
	if len(values) == 0 {
		return cfg
	}
	if v, ok := values["viewMode"].(string); ok && (v == "2d" || v == "3d") {
		cfg.ViewMode = v
	}
	if v, ok := values["repoSource"].(string); ok && v != "" {
		cfg.RepoSource = v
	}
	if v, ok := values["repoPath"].(string); ok {
		cfg.RepoPath = strings.TrimSpace(v)
	}
	if v, ok := asFloat(values["secondsPerDay"]); ok {
		cfg.SecondsPerDay = math.Max(0.02, math.Min(10.0, v))
	}
	if v, ok := values["autoOrbit"].(bool); ok {
		cfg.AutoOrbit = v
	}
	if v, ok := values["showLabels"].(bool); ok {
		cfg.ShowLabels = v
	}
	if v, ok := values["enableBloom"].(bool); ok {
		cfg.EnableBloom = v
	}
	return cfg
}

func expandUserRepoPath(raw string) string {
	if raw == "" {
		return ""
	}
	if raw == "~" || strings.HasPrefix(raw, "~/") {
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			if raw == "~" {
				return home
			}
			return filepath.Join(home, raw[2:])
		}
	}
	return raw
}

func hasLocalVCSRepo(dir string) bool {
	if dir == "" {
		return false
	}
	abs, err := filepath.Abs(expandUserRepoPath(dir))
	if err != nil {
		return false
	}
	info, err := os.Stat(abs)
	if err != nil || !info.IsDir() {
		return false
	}
	cur := abs
	for depth := 0; depth < 32; depth++ {
		if _, err := os.Stat(filepath.Join(cur, ".git")); err == nil {
			return true
		}
		if _, err := os.Stat(filepath.Join(cur, ".hg")); err == nil {
			return true
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			break
		}
		cur = parent
	}
	return false
}

func materializeEmbeddedGitLog() (logPath string, tempDir string, err error) {
	seq := atomic.AddUint64(&zourceSessionID, 1)
	tempDir = filepath.Join(os.TempDir(), fmt.Sprintf("wscreensavers-zource-%d-%d", os.Getpid(), seq))
	if err := os.MkdirAll(tempDir, 0700); err != nil {
		return "", "", err
	}

	gz, err := gzip.NewReader(bytes.NewReader(embeddedGitSelfHostLogGz))
	if err != nil {
		_ = os.RemoveAll(tempDir)
		return "", "", err
	}
	defer gz.Close()

	// zource derives the root bubble name from filepath.Base(logPath), so naming the file "git"
	// titles the central repository sphere "git".
	logPath = filepath.Join(tempDir, "git")
	outFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		_ = os.RemoveAll(tempDir)
		return "", "", err
	}
	if _, err := io.Copy(outFile, gz); err != nil {
		_ = outFile.Close()
		_ = os.RemoveAll(tempDir)
		return "", "", err
	}
	if err := outFile.Close(); err != nil {
		_ = os.RemoveAll(tempDir)
		return "", "", err
	}
	return logPath, tempDir, nil
}

func appendCommonZourceFlags(args []string, cfg zourceSettings) []string {
	if cfg.ViewMode == "2d" {
		args = append(args, "--2d")
	} else {
		args = append(args, "--3d")
	}
	args = append(args, "--seconds-per-day", fmt.Sprintf("%.2f", cfg.SecondsPerDay), "--loop")
	if !cfg.AutoOrbit {
		args = append(args, "--no-orbit")
	}
	if !cfg.ShowLabels {
		args = append(args, "--no-labels")
	}
	if !cfg.EnableBloom {
		args = append(args, "--no-bloom")
	}
	return args
}

// PrepareZourceStreamSession builds headless P6 PPM streaming arguments for /usr/bin/zource.
func PrepareZourceStreamSession(fallbackBin string, width, height, fps int, values map[string]any) (binPath string, args []string, tempDir string, err error) {
	binPath = findZourceBinary()
	if binPath == "" {
		binPath = fallbackBin
	}
	if binPath == "" {
		return "", nil, "", fmt.Errorf("zource binary not found")
	}
	if width <= 0 {
		width = defaultWidth
	}
	if height <= 0 {
		height = defaultHeight
	}
	if fps <= 0 {
		fps = 15
	} else if fps > 24 {
		fps = 24
	}

	cfg := parseZourceSettings(values)
	args = make([]string, 0, 16)
	args = appendCommonZourceFlags(args, cfg)
	args = append(args,
		"--size", fmt.Sprintf("%dx%d", width, height),
		"--fps", fmt.Sprintf("%d", fps),
		"--output-ppm", "-",
	)

	if cfg.RepoSource == "custom_repo" && hasLocalVCSRepo(cfg.RepoPath) {
		args = append(args, expandUserRepoPath(cfg.RepoPath))
		return binPath, args, "", nil
	}

	logPath, tempDir, err := materializeEmbeddedGitLog()
	if err != nil {
		return "", nil, "", err
	}
	args = append(args, "--log", logPath)
	return binPath, args, tempDir, nil
}

// PrepareZourceWaylandSession builds native Wayland window arguments for /usr/bin/zource.
func PrepareZourceWaylandSession(fallbackBin string, width, height int, values map[string]any) (binPath string, args []string, tempDir string, err error) {
	binPath = findZourceBinary()
	if binPath == "" {
		binPath = fallbackBin
	}
	if binPath == "" {
		return "", nil, "", fmt.Errorf("zource binary not found")
	}
	if width <= 0 {
		width = 1920
	}
	if height <= 0 {
		height = 1080
	}

	cfg := parseZourceSettings(values)
	args = make([]string, 0, 16)
	args = append(args, "--wayland")
	args = appendCommonZourceFlags(args, cfg)
	args = append(args, "--size", fmt.Sprintf("%dx%d", width, height))

	if cfg.RepoSource == "custom_repo" && hasLocalVCSRepo(cfg.RepoPath) {
		args = append(args, expandUserRepoPath(cfg.RepoPath))
		return binPath, args, "", nil
	}

	logPath, tempDir, err := materializeEmbeddedGitLog()
	if err != nil {
		return "", nil, "", err
	}
	args = append(args, "--log", logPath)
	return binPath, args, tempDir, nil
}
