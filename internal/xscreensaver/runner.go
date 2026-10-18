package xscreensaver

import (
	"fmt"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"wscreensavers/internal/models"
)

// Runner manages running external XScreenSaver processes on Wayland/XWayland.
type Runner struct {
	mu    sync.Mutex
	procs map[string]*exec.Cmd
}

func NewRunner() *Runner {
	return &Runner{
		procs: make(map[string]*exec.Cmd),
	}
}

// Launch starts an external XScreenSaver binary with configured parameters.
func (r *Runner) Launch(saver models.Screensaver, values map[string]any, key string) (int, error) {
	if saver.BinaryPath == "" {
		return 0, fmt.Errorf("screensaver %s does not have a binary path", saver.ID)
	}

	r.Stop(key)

	args := BuildCommandArgs(saver, values)
	// Strip -root when launching standalone window on XWayland so the compositor can fullscreen it
	filtered := make([]string, 0, len(args))
	for _, a := range args {
		if a != "-root" {
			filtered = append(filtered, a)
		}
	}

	cmd := exec.Command(saver.BinaryPath, filtered...)
	cmd.Env = os.Environ()
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := cmd.Start(); err != nil {
		return 0, fmt.Errorf("failed to start xscreensaver binary %s: %w", saver.BinaryPath, err)
	}

	r.mu.Lock()
	r.procs[key] = cmd
	r.mu.Unlock()

	pid := cmd.Process.Pid
	go func() {
		_ = cmd.Wait()
		r.mu.Lock()
		if current, ok := r.procs[key]; ok && current == cmd {
			delete(r.procs, key)
		}
		r.mu.Unlock()
	}()

	return pid, nil
}

// Stop terminates a running external XScreenSaver binary by key.
func (r *Runner) Stop(key string) {
	r.mu.Lock()
	cmd, ok := r.procs[key]
	if ok {
		delete(r.procs, key)
	}
	r.mu.Unlock()

	if ok && cmd != nil && cmd.Process != nil {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
		_ = cmd.Process.Kill()
	}
}

// StopAll terminates all running external XScreenSaver binaries.
func (r *Runner) StopAll() {
	r.mu.Lock()
	keys := make([]string, 0, len(r.procs))
	for k := range r.procs {
		keys = append(keys, k)
	}
	r.mu.Unlock()

	for _, k := range keys {
		r.Stop(k)
	}
}
