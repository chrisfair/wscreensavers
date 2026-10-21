package shuffle

import (
	"path/filepath"
	"testing"
)

func TestNextExhaustsPoolBeforeRepeating(t *testing.T) {
	path := filepath.Join(t.TempDir(), "shuffle.json")
	pool := []string{"a", "b", "c", "d", "e"}

	last := ""
	for round := 0; round < 3; round++ {
		seen := map[string]bool{}
		for range pool {
			id := Next(path, pool)
			if seen[id] {
				t.Fatalf("round %d: %q drawn twice before pool exhausted", round, id)
			}
			seen[id] = true
			if round > 0 && len(seen) == 1 && id == last {
				t.Fatalf("round %d: first pick repeated last pick %q", round, id)
			}
			last = id
		}
	}
}

func TestNextHandlesShrinkingPoolAndSingleEntry(t *testing.T) {
	path := filepath.Join(t.TempDir(), "shuffle.json")
	Next(path, []string{"a", "b", "c"})
	if id := Next(path, []string{"z"}); id != "z" {
		t.Errorf("expected z, got %q", id)
	}
	if id := Next(path, []string{"z"}); id != "z" {
		t.Errorf("single-entry pool must still return its entry, got %q", id)
	}
	if id := Next(path, nil); id != "" {
		t.Errorf("empty pool should return empty string, got %q", id)
	}
}
