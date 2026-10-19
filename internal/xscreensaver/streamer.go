package xscreensaver

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"
	"wscreensavers/internal/models"
)

// Streamer manages an offscreen Xvfb X11 server (:97) and runs any /usr/lib/xscreensaver/*
// binary on its root window, streaming real-time MJPEG frames over HTTP to WebKit2GTK
// surfaces (Control Center preview, Wayland Layer-Shell Overlay, Lock Screen, and Wallpaper).
type Streamer struct {
	mu          sync.Mutex
	displayNum  int
	width       int
	height      int
	xvfbCmd     *exec.Cmd
	hackCmd     *exec.Cmd
	activeSaver string
	activeArgs  string
}

func NewStreamer() *Streamer {
	return &Streamer{
		displayNum: 97,
		width:      960,
		height:     540,
	}
}

func (s *Streamer) displayString() string {
	return fmt.Sprintf(":%d", s.displayNum)
}

func (s *Streamer) ensureXvfbLocked() error {
	if s.xvfbCmd != nil && s.xvfbCmd.Process != nil {
		if err := s.xvfbCmd.Process.Signal(syscall.Signal(0)); err == nil {
			return nil
		}
	}

	// Clean up any stale lock files for :97
	_ = os.Remove(fmt.Sprintf("/tmp/.X%d-lock", s.displayNum))
	_ = os.Remove(fmt.Sprintf("/tmp/.X11-unix/X%d", s.displayNum))

	disp := s.displayString()
	geom := fmt.Sprintf("%dx%dx24", s.width, s.height)
	cmd := exec.Command("Xvfb", disp, "-screen", "0", geom, "-nolisten", "tcp", "+extension", "GLX")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start Xvfb on %s: %w", disp, err)
	}
	s.xvfbCmd = cmd
	time.Sleep(250 * time.Millisecond)
	return nil
}

func (s *Streamer) stopHackLocked() {
	if s.hackCmd != nil && s.hackCmd.Process != nil {
		_ = syscall.Kill(-s.hackCmd.Process.Pid, syscall.SIGTERM)
		_ = s.hackCmd.Process.Kill()
		_, _ = s.hackCmd.Process.Wait()
	}
	s.hackCmd = nil
}

// EnsureRunning starts Xvfb and launches the requested XScreenSaver binary on the virtual root window.
func (s *Streamer) EnsureRunning(saver models.Screensaver, values map[string]any) error {
	if saver.BinaryPath == "" {
		return fmt.Errorf("saver %s has no binary path", saver.ID)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.ensureXvfbLocked(); err != nil {
		return err
	}

	args := BuildCommandArgs(saver, values)
	argsKey := fmt.Sprintf("%v", args)

	if s.activeSaver == saver.ID && s.activeArgs == argsKey && s.hackCmd != nil && s.hackCmd.Process != nil {
		if err := s.hackCmd.Process.Signal(syscall.Signal(0)); err == nil {
			return nil
		}
	}

	s.stopHackLocked()

	// Clear root window before starting new hack
	cmd := exec.Command(saver.BinaryPath, args...)
	env := os.Environ()
	env = append(env, "DISPLAY="+s.displayString())
	cmd.Env = env
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start xscreensaver binary %s: %w", saver.BinaryPath, err)
	}

	s.hackCmd = cmd
	s.activeSaver = saver.ID
	s.activeArgs = argsKey
	time.Sleep(120 * time.Millisecond)
	return nil
}

// ServeMJPEG streams live frames from the Xvfb display as multipart/x-mixed-replace MJPEG.
func (s *Streamer) ServeMJPEG(w http.ResponseWriter, r *http.Request, saver models.Screensaver, values map[string]any, fps int) {
	if err := s.EnsureRunning(saver, values); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if fps <= 0 || fps > 60 {
		fps = 30
	}

	w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary=ffmpeg")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	w.Header().Set("Connection", "close")

	disp := fmt.Sprintf("%s.0", s.displayString())
	size := fmt.Sprintf("%dx%d", s.width, s.height)
	rate := fmt.Sprintf("%d", fps)

	ffCmd := exec.CommandContext(r.Context(),
		"ffmpeg",
		"-loglevel", "error",
		"-f", "x11grab",
		"-draw_mouse", "0",
		"-framerate", rate,
		"-video_size", size,
		"-i", disp,
		"-f", "mpjpeg",
		"-q:v", "6",
		"-",
	)
	ffCmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	stdout, err := ffCmd.StdoutPipe()
	if err != nil {
		return
	}
	if err := ffCmd.Start(); err != nil {
		return
	}

	defer func() {
		if ffCmd.Process != nil {
			_ = syscall.Kill(-ffCmd.Process.Pid, syscall.SIGTERM)
			_ = ffCmd.Process.Kill()
		}
		_ = ffCmd.Wait()
	}()

	_, _ = io.Copy(w, stdout)
}

// StopAll terminates both the running XScreenSaver hack and the Xvfb server.
func (s *Streamer) StopAll() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.stopHackLocked()
	if s.xvfbCmd != nil && s.xvfbCmd.Process != nil {
		_ = syscall.Kill(-s.xvfbCmd.Process.Pid, syscall.SIGTERM)
		_ = s.xvfbCmd.Process.Kill()
		_, _ = s.xvfbCmd.Process.Wait()
	}
	s.xvfbCmd = nil
}
