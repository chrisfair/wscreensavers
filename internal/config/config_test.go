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
