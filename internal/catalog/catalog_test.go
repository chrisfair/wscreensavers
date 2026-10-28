package catalog

import "testing"

func TestBuiltinScreensaversCatalog(t *testing.T) {
	savers := BuiltinScreensavers()
	if len(savers) < 25 {
		t.Fatalf("expected at least 25 builtin screensavers, got %d", len(savers))
	}

	seen := make(map[string]bool)
	for _, s := range savers {
		if s.ID == "" || s.Name == "" || s.Category == "" {
			t.Errorf("screensaver has empty metadata: %+v", s)
		}
		if seen[s.ID] {
			t.Errorf("duplicate screensaver ID: %s", s.ID)
		}
		seen[s.ID] = true
	}
	if !seen["surface3d"] {
		t.Errorf("expected surface3d (3D Function Plotter) in builtin catalog")
	}
}
