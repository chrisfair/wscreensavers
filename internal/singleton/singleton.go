// Package singleton prevents more than one instance of a given mode from
// running at once, using an flock(2) advisory lock that the kernel releases
// automatically when the process exits (even on a crash).
package singleton

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

// ErrAlreadyRunning is returned when another process holds the lock.
var ErrAlreadyRunning = errors.New("another instance is already running")

const retryInterval = 50 * time.Millisecond

// held keeps acquired lock files referenced for the life of the process.
// Callers may discard the release function, and an unreferenced *os.File is
// closed by its finalizer on the next GC, which would silently drop the flock.
var (
	heldMu sync.Mutex
	held   = map[*os.File]struct{}{}
)

func lockPath(dir, name string) string {
	return filepath.Join(dir, fmt.Sprintf("wscreensavers-%s.lock", name))
}

func runtimeDir() string {
	if dir := os.Getenv("XDG_RUNTIME_DIR"); dir != "" {
		return dir
	}
	return os.TempDir()
}

func writePID(f *os.File) {
	_ = f.Truncate(0)
	_, _ = f.Seek(0, 0)
	_, _ = fmt.Fprintf(f, "%d\n", os.Getpid())
}

func readPID(path string) int {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	pid, _ := strconv.Atoi(strings.TrimSpace(string(data)))
	return pid
}

// Acquire takes the named lock, retrying for up to wait so that a predecessor
// that is being replaced (e.g. by `ctl launch`) has time to exit. The returned
// release function is optional; the lock is dropped on process exit regardless.
func Acquire(name string, wait time.Duration) (release func(), err error) {
	return acquireIn(runtimeDir(), name, wait)
}

func acquireIn(dir, name string, wait time.Duration) (func(), error) {
	path := lockPath(dir, name)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}

	deadline := time.Now().Add(wait)
	for {
		err = syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
		if err == nil {
			heldMu.Lock()
			held[f] = struct{}{}
			heldMu.Unlock()
			writePID(f)
			return func() {
				heldMu.Lock()
				delete(held, f)
				heldMu.Unlock()
				_ = f.Close()
			}, nil
		}
		if !errors.Is(err, syscall.EWOULDBLOCK) {
			_ = f.Close()
			return nil, err
		}
		if time.Now().After(deadline) {
			_ = f.Close()
			return nil, ErrAlreadyRunning
		}
		time.Sleep(retryInterval)
	}
}

// AcquireOrReplace acquires the lock. If held by an existing instance, it
// signals the old instance to terminate, waits for it to exit, and takes over.
func AcquireOrReplace(name string, wait time.Duration) (func(), error) {
	return acquireOrReplaceIn(runtimeDir(), name, wait)
}

func acquireOrReplaceIn(dir, name string, wait time.Duration) (func(), error) {
	path := lockPath(dir, name)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}

	// Try immediate non-blocking acquire first
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err == nil {
		heldMu.Lock()
		held[f] = struct{}{}
		heldMu.Unlock()
		writePID(f)
		return func() {
			heldMu.Lock()
			delete(held, f)
			heldMu.Unlock()
			_ = f.Close()
		}, nil
	}

	// Lock is currently held. Read old PID and signal it to terminate.
	oldPID := readPID(path)
	if oldPID > 0 && oldPID != os.Getpid() {
		_ = syscall.Kill(oldPID, syscall.SIGTERM)
	}

	deadline := time.Now().Add(wait)
	killSent := false
	for {
		err = syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
		if err == nil {
			heldMu.Lock()
			held[f] = struct{}{}
			heldMu.Unlock()
			writePID(f)
			return func() {
				heldMu.Lock()
				delete(held, f)
				heldMu.Unlock()
				_ = f.Close()
			}, nil
		}
		if !errors.Is(err, syscall.EWOULDBLOCK) {
			_ = f.Close()
			return nil, err
		}
		if time.Now().After(deadline) {
			_ = f.Close()
			return nil, ErrAlreadyRunning
		}
		// If predecessor hasn't exited halfway through the wait, escalate to SIGKILL
		if !killSent && oldPID > 0 && oldPID != os.Getpid() && time.Until(deadline) < (wait/2) {
			_ = syscall.Kill(oldPID, syscall.SIGKILL)
			killSent = true
		}
		time.Sleep(retryInterval)
	}
}
