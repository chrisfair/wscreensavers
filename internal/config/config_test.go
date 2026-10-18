package config

import (
	"path/filepath"
	"testing"
)

func TestConfigManagerPersistence(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "config.json")
	mgr, err := NewManager(tmp)
	if err != nil {
		t.Fatalf("unexpected error creating config manager: %v", err)
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

	mgr2, err := NewManager(tmp)
	if err != nil {
		t.Fatalf("failed to reload config manager: %v", err)
	}
	if mgr2.Get().SelectedSaver != "boing" || mgr2.Get().IdleTimeoutMinutes != 15 {
		t.Errorf("persisted config mismatch: %+v", mgr2.Get())
	}
}
