// Package shuffle implements a persistent "shuffle bag" so random picks cycle
// through the whole pool before any entry repeats, even across processes.
package shuffle

import (
	"encoding/json"
	"math/rand"
	"os"
	"path/filepath"
	"syscall"
)

type state struct {
	Played []string `json:"played"`
}

// Next returns a pool entry that has not been drawn yet in the current round
// and records it in the state file at path. Once every entry has been drawn the
// round resets, and the entry drawn last is excluded from the next draw so a
// round boundary never produces an immediate repeat. Persistence is best
// effort: on I/O failure the pick is still random, just not remembered.
func Next(path string, pool []string) string {
	if len(pool) == 0 {
		return ""
	}

	unlock := lock(path)
	defer unlock()

	var st state
	if data, err := os.ReadFile(path); err == nil {
		_ = json.Unmarshal(data, &st)
	}

	inPool := make(map[string]bool, len(pool))
	for _, id := range pool {
		inPool[id] = true
	}
	played := make(map[string]bool, len(st.Played))
	kept := st.Played[:0]
	for _, id := range st.Played {
		if inPool[id] && !played[id] {
			played[id] = true
			kept = append(kept, id)
		}
	}
	st.Played = kept

	pick := draw(pool, played)
	if pick == "" {
		last := ""
		if n := len(st.Played); n > 0 {
			last = st.Played[n-1]
		}
		st.Played = st.Played[:0]
		played = map[string]bool{}
		if len(pool) > 1 && last != "" {
			played[last] = true
		}
		pick = draw(pool, played)
		if pick == "" {
			pick = pool[rand.Intn(len(pool))]
		}
	}
	st.Played = append(st.Played, pick)

	if data, err := json.Marshal(st); err == nil {
		_ = os.MkdirAll(filepath.Dir(path), 0755)
		_ = os.WriteFile(path, data, 0644)
	}
	return pick
}

func draw(pool []string, exclude map[string]bool) string {
	candidates := make([]string, 0, len(pool))
	for _, id := range pool {
		if !exclude[id] {
			candidates = append(candidates, id)
		}
	}
	if len(candidates) == 0 {
		return ""
	}
	return candidates[rand.Intn(len(candidates))]
}

// lock serialises concurrent pickers (daemon and ctl run as separate processes).
func lock(path string) func() {
	_ = os.MkdirAll(filepath.Dir(path), 0755)
	f, err := os.OpenFile(path+".lock", os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		return func() {}
	}
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX); err != nil {
		f.Close()
		return func() {}
	}
	return func() {
		_ = syscall.Flock(int(f.Fd()), syscall.LOCK_UN)
		f.Close()
	}
}
