package xscreensaver

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
	"wscreensavers/internal/models"
)

// Runner manages running external XScreenSaver processes on Wayland/XWayland.
type Runner struct {
	mu       sync.Mutex
	procs    map[string]*exec.Cmd
	tempDirs map[string]string
}

func NewRunner() *Runner {
	return &Runner{
		procs:    make(map[string]*exec.Cmd),
		tempDirs: make(map[string]string),
	}
}

// Launch starts an external XScreenSaver binary with configured parameters.
func (r *Runner) Launch(saver models.Screensaver, values map[string]any, key string) (int, error) {
	if saver.BinaryPath == "" {
		return 0, fmt.Errorf("screensaver %s does not have a binary path", saver.ID)
	}

	r.Stop(key)

	binPath := saver.BinaryPath
	var filtered []string
	env := os.Environ()
	var tempDir string

	if IsCelestiaTourSaver(saver) {
		var extraEnv []string
		var err error
		binPath, filtered, extraEnv, tempDir, err = PrepareCelestiaSession(key, 0, 1920, 1080, values)
		if err != nil {
			return 0, err
		}
		filtered = append(filtered, "--fullscreen")
		env = mergeEnv(env, extraEnv)
	} else {
		args := BuildCommandArgs(saver, values)
		// Strip -root when launching standalone window on XWayland so the compositor can fullscreen it
		filtered = make([]string, 0, len(args)+2)
		for _, a := range args {
			if a != "-root" {
				filtered = append(filtered, a)
			}
		}
	}

	// Apply dynamic Hyprland windowrule so the XScreenSaver window opens fullscreen
	binBase := filepath.Base(binPath)
	_ = exec.Command("hyprctl", "keyword", "windowrulev2", fmt.Sprintf("fullscreen,class:^(?i)(%s).*", binBase)).Run()
	_ = exec.Command("hyprctl", "keyword", "windowrulev2", fmt.Sprintf("fullscreen,title:^(?i)(%s).*", binBase)).Run()

	cmd := exec.Command(binPath, filtered...)
	cmd.Env = env
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := cmd.Start(); err != nil {
		if tempDir != "" {
			_ = os.RemoveAll(tempDir)
		}
		return 0, fmt.Errorf("failed to start xscreensaver binary %s: %w", binPath, err)
	}

	r.mu.Lock()
	r.procs[key] = cmd
	if tempDir != "" {
		r.tempDirs[key] = tempDir
	}
	r.mu.Unlock()

	pid := cmd.Process.Pid
	go func() {
		_ = cmd.Wait()
		var cleanupDir string
		r.mu.Lock()
		if current, ok := r.procs[key]; ok && current == cmd {
			delete(r.procs, key)
			cleanupDir = r.tempDirs[key]
			delete(r.tempDirs, key)
		}
		r.mu.Unlock()
		if cleanupDir != "" {
			_ = os.RemoveAll(cleanupDir)
		}
	}()

	return pid, nil
}

// RunBlocking launches an external XScreenSaver binary in fullscreen and waits until it exits
// or the user moves the Wayland cursor.
func RunBlocking(saver models.Screensaver, values map[string]any) error {
	r := NewRunner()
	_, err := r.Launch(saver, values, "blocking")
	if err != nil {
		return err
	}
	defer r.StopAll()

	// Wait a brief grace period before arming cursor-motion dismiss
	time.Sleep(900 * time.Millisecond)
	initialPos := readCursorPos()

	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		r.mu.Lock()
		_, stillRunning := r.procs["blocking"]
		r.mu.Unlock()
		if !stillRunning {
			return nil
		}

		curPos := readCursorPos()
		if initialPos != "" && curPos != "" && curPos != initialPos {
			r.StopAll()
			return nil
		}
		if initialPos == "" && curPos != "" {
			initialPos = curPos
		}
	}
	return nil
}

func readCursorPos() string {
	out, err := exec.Command("hyprctl", "cursorpos").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// Stop terminates a running external XScreenSaver binary by key.
func (r *Runner) Stop(key string) {
	r.mu.Lock()
	cmd, ok := r.procs[key]
	if ok {
		delete(r.procs, key)
	}
	cleanupDir := r.tempDirs[key]
	delete(r.tempDirs, key)
	r.mu.Unlock()

	if ok && cmd != nil && cmd.Process != nil {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
		_ = cmd.Process.Kill()
	}
	if cleanupDir != "" {
		_ = os.RemoveAll(cleanupDir)
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
