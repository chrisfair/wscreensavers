package config

import (
	"path/filepath"
	"testing"
	"wscreensavers/internal/models"
)

func TestConfigManagerPersistence(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "config.json")
	mgr, err := NewManager(tmp)
	if err != nil {
		t.Fatalf("unexpected error creating config manager: %v", err)
	}
	if mgr.Path() != tmp {
		t.Errorf("expected path %s, got %s", tmp, mgr.Path())
	}

	cfg := mgr.Get()
	if cfg.SelectedSaver != "glmatrix" {
		t.Errorf("expected default selectedSaver glmatrix, got %s", cfg.SelectedSaver)
	}

	cfg.SelectedSaver = "boing"
	cfg.IdleTimeoutMinutes = 15
	if err := mgr.Update(cfg); err != nil {
		t.Fatalf("failed to update config: %v", err)
	}

	if err := mgr.SetSaverParams("boing", map[string]any{"speed": 2.0}); err != nil {
		t.Fatalf("failed to set saver params: %v", err)
	}

	defaults := mgr.ResetSaverParams("boing", []models.SaverParam{
		{ID: "speed", Default: 1.0},
	})
	if defaults["speed"] != 1.0 {
		t.Errorf("expected reset speed 1.0, got %v", defaults["speed"])
	}

	mgr2, err := NewManager(tmp)
	if err != nil {
		t.Fatalf("failed to reload config manager: %v", err)
	}
	if mgr2.Get().SelectedSaver != "boing" || mgr2.Get().IdleTimeoutMinutes != 15 {
		t.Errorf("persisted config mismatch: %+v", mgr2.Get())
	}
}

func TestSanitizeWallpaperPerMonitor(t *testing.T) {
	input := map[string]string{
		"HDMI-A-1": "glmatrix",
		"DP-2":     "sonar",
		"DP-3":     "glmatrix", // duplicate with HDMI-A-1
	}
	cleaned := SanitizeWallpaperPerMonitor(input)
	if len(cleaned) != 2 {
		t.Fatalf("expected 2 unique monitor mappings, got %d", len(cleaned))
	}
	if cleaned["DP-3"] != "glmatrix" {
		t.Errorf("expected DP-3 to have glmatrix, got %s", cleaned["DP-3"])
	}
	if _, exists := cleaned["HDMI-A-1"]; exists {
		t.Errorf("expected HDMI-A-1 duplicate to be cleared")
	}
	if cleaned["DP-2"] != "sonar" {
		t.Errorf("expected DP-2 to keep sonar, got %s", cleaned["DP-2"])
	}
}
