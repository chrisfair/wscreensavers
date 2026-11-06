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
	if !seen["celestia"] {
		t.Errorf("expected celestia (Celestia: Solar System Tour) in builtin catalog")
	}
	if !seen["hyperdimension"] {
		t.Errorf("expected hyperdimension (4D Polytopes & Klein Manifolds) in builtin catalog")
	}
	if !seen["soroban3d"] {
		t.Errorf("expected soroban3d (3D Abacus & Roman Tabula) in builtin catalog")
	}
	if !seen["fractals3d"] {
		t.Errorf("expected fractals3d (3D Fractal Zoom & Recursive Polyhedra) in builtin catalog")
	}
}
