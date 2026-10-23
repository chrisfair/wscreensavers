package singleton

import (
	"errors"
	"runtime"
	"testing"
	"time"
)

func TestSecondAcquireFailsUntilReleased(t *testing.T) {
	dir := t.TempDir()

	release, err := acquireIn(dir, "saver", 0)
	if err != nil {
		t.Fatalf("first acquire: %v", err)
	}

	if _, err := acquireIn(dir, "saver", 0); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("second acquire = %v, want ErrAlreadyRunning", err)
	}

	release()

	release2, err := acquireIn(dir, "saver", 0)
	if err != nil {
		t.Fatalf("acquire after release: %v", err)
	}
	release2()
}

func TestDifferentNamesAreIndependent(t *testing.T) {
	dir := t.TempDir()

	a, err := acquireIn(dir, "saver", 0)
	if err != nil {
		t.Fatal(err)
	}
	defer a()

	b, err := acquireIn(dir, "lock", 0)
	if err != nil {
		t.Fatalf("lock should not conflict with saver: %v", err)
	}
	b()
}

func TestWaitsForPredecessorToExit(t *testing.T) {
	dir := t.TempDir()

	release, err := acquireIn(dir, "saver", 0)
	if err != nil {
		t.Fatal(err)
	}
	go func() {
		time.Sleep(200 * time.Millisecond)
		release()
	}()

	r, err := acquireIn(dir, "saver", 2*time.Second)
	if err != nil {
		t.Fatalf("expected to acquire after predecessor exits: %v", err)
	}
	r()
}

// main.go discards the release function, so the lock must survive garbage
// collection of everything the caller no longer references.
func TestLockSurvivesDiscardedRelease(t *testing.T) {
	dir := t.TempDir()

	if _, err := acquireIn(dir, "lock", 0); err != nil {
		t.Fatalf("first acquire: %v", err)
	}

	for i := 0; i < 5; i++ {
		runtime.GC()
		time.Sleep(10 * time.Millisecond)
	}

	if _, err := acquireIn(dir, "lock", 0); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("second acquire after GC = %v, want ErrAlreadyRunning", err)
	}
}

func TestAcquireOrReplaceTakesOver(t *testing.T) {
	dir := t.TempDir()

	rel1, err := acquireIn(dir, "wallpaper", 0)
	if err != nil {
		t.Fatalf("first acquire: %v", err)
	}

	// Release in background to simulate old process terminating upon SIGTERM
	go func() {
		time.Sleep(100 * time.Millisecond)
		rel1()
	}()

	rel2, err := acquireOrReplaceIn(dir, "wallpaper", 2*time.Second)
	if err != nil {
		t.Fatalf("acquireOrReplace failed: %v", err)
	}
	defer rel2()
}
