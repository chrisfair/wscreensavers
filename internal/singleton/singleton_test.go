package singleton

import (
	"errors"
	"os"
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

	// Immediate uncontested AcquireOrReplace
	rel0, err := acquireOrReplaceIn(dir, "immediate", 100*time.Millisecond)
	if err != nil {
		t.Fatalf("immediate acquireOrReplace failed: %v", err)
	}
	rel0()

	rel1, err := acquireIn(dir, "wallpaper", 0)
	if err != nil {
		t.Fatalf("first acquire: %v", err)
	}

	// Timeout when holder refuses to exit
	if _, err := acquireOrReplaceIn(dir, "wallpaper", 60*time.Millisecond); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("expected ErrAlreadyRunning on timeout, got %v", err)
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

	// Test top-level Acquire and AcquireOrReplace with XDG_RUNTIME_DIR pointed at temp dir
	origXDG := os.Getenv("XDG_RUNTIME_DIR")
	_ = os.Setenv("XDG_RUNTIME_DIR", dir)
	defer func() { _ = os.Setenv("XDG_RUNTIME_DIR", origXDG) }()

	relTop, err := Acquire("toptest", 50*time.Millisecond)
	if err != nil {
		t.Fatalf("Acquire failed: %v", err)
	}
	relTop()

	relRep, err := AcquireOrReplace("toptest", 50*time.Millisecond)
	if err != nil {
		t.Fatalf("AcquireOrReplace failed: %v", err)
	}
	relRep()
}
