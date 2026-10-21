package singleton

import (
	"errors"
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
