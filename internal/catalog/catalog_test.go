package catalog

import "testing"

func TestBuiltinScreensaversCatalog(t *testing.T) {
	savers := BuiltinScreensavers()
	if len(savers) < 33 {
		t.Fatalf("expected at least 33 builtin screensavers, got %d", len(savers))
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
	if !seen["ameswindow"] {
		t.Errorf("expected ameswindow (Ames Window Optical Illusion) in builtin catalog")
	}
	if !seen["dnd5edice"] {
		t.Errorf("expected dnd5edice (5e Tabletop Dice & Battle Mat) in builtin catalog")
	}
	if !seen["zourcegit"] {
		t.Errorf("expected zourcegit (Zource: Git Self-Hosting History) in builtin catalog")
	}
	if !seen["sculptures3d"] {
		t.Errorf("expected sculptures3d (Classical Sculptures Gallery (3D)) in builtin catalog")
	}
}

func TestSafeForWorkFilter(t *testing.T) {
	if !IsNSFW("handsy") || !IsNSFW("xss_handsy") || !IsNSFW("XSS_WEBCOLLAGE") {
		t.Fatalf("expected handsy and webcollage to be flagged NSFW")
	}
	if IsNSFW("glmatrix") || IsNSFW("sculptures3d") {
		t.Fatalf("expected glmatrix and sculptures3d to be safe for work")
	}
	if NSFWReason("xss_handsy") == "" {
		t.Fatalf("expected non-empty reason for xss_handsy")
	}
	ids := FilterSafeForWorkIDs([]string{"glmatrix", "xss_handsy", "xss_webcollage", "flurry"}, true)
	if len(ids) != 2 || ids[0] != "glmatrix" || ids[1] != "flurry" {
		t.Fatalf("unexpected filtered IDs: %v", ids)
	}
	raw := FilterSafeForWorkIDs([]string{"glmatrix", "xss_handsy"}, false)
	if len(raw) != 2 {
		t.Fatalf("expected unfiltered IDs when safeForWork=false")
	}
}
