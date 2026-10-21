package xscreensaver

/*
#cgo pkg-config: x11
#include <stdlib.h>
#include <X11/Xlib.h>

static void clear_x11_root(const char *display_name) {
    Display *dpy = XOpenDisplay(display_name);
    if (!dpy) return;
    int scr = DefaultScreen(dpy);
    Window root = RootWindow(dpy, scr);
    XSetWindowBackground(dpy, root, BlackPixel(dpy, scr));
    XClearWindow(dpy, root);
    XFlush(dpy);
    XCloseDisplay(dpy);
}
*/
import "C"

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
	"wscreensavers/internal/models"
)

// Streamer manages offscreen Xvfb X11 servers and runs any /usr/lib/xscreensaver/*
// binary on their root windows, streaming real-time MJPEG frames over HTTP to WebKit2GTK
// surfaces (Control Center preview, Wayland Layer-Shell Overlay, Lock Screen, and Wallpaper).
//
// Each monitor gets its own session (Xvfb display, hack process, and geometry), so
// different monitors can run different OpenGL hacks at their native resolution. Clients
// that pass the same session key (for example, clone mode) share one session.
type Streamer struct {
	mu          sync.Mutex
	sessions    map[string]*session
	nextDisplay int
}

const (
	defaultSessionKey = "default"
	baseDisplayNum    = 97
	defaultWidth      = 960
	defaultHeight     = 540
	defaultMaxDim     = 1920
	minMaxDim         = 320
	maxMaxDim         = 3840
)

// session is one Xvfb server plus the hack running on its root window.
type session struct {
	mu            sync.Mutex
	key           string
	displayNum    int
	width         int
	height        int
	xvfbCmd       *exec.Cmd
	hackCmd       *exec.Cmd
	activeSaver   string
	activeArgs    string
	activeStreams map[string]context.CancelFunc
}

func NewStreamer() *Streamer {
	return &Streamer{
		sessions:    make(map[string]*session),
		nextDisplay: baseDisplayNum + 1,
	}
}

// normalizeSize clamps a requested geometry to something Xvfb and the MJPEG encoder accept:
// even dimensions, at most maxDim on the long edge, aspect ratio preserved.
// A maxDim outside the supported range falls back to the default.
func normalizeSize(w, h, maxDim int) (int, int) {
	if w <= 0 || h <= 0 {
		return defaultWidth, defaultHeight
	}
	if maxDim < minMaxDim || maxDim > maxMaxDim {
		maxDim = defaultMaxDim
	}
	if long := max(w, h); long > maxDim {
		w = w * maxDim / long
		h = h * maxDim / long
	}
	w &^= 1
	h &^= 1
	if w < 64 || h < 64 {
		return defaultWidth, defaultHeight
	}
	return w, h
}

// sessionFor returns the session for key, creating it (without starting any process) if needed.
func (s *Streamer) sessionFor(key string) *session {
	if key == "" {
		key = defaultSessionKey
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if sess, ok := s.sessions[key]; ok {
		return sess
	}
	num := baseDisplayNum
	if key != defaultSessionKey {
		num = s.nextDisplay
		s.nextDisplay++
	}
	sess := &session{
		key:           key,
		displayNum:    num,
		width:         defaultWidth,
		height:        defaultHeight,
		activeStreams: make(map[string]context.CancelFunc),
	}
	s.sessions[key] = sess
	return sess
}

func (s *Streamer) allSessions() []*session {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*session, 0, len(s.sessions))
	for _, sess := range s.sessions {
		out = append(out, sess)
	}
	return out
}

func (sess *session) displayString() string {
	return fmt.Sprintf(":%d", sess.displayNum)
}

func (sess *session) clearRootWindow() {
	cDisp := C.CString(sess.displayString())
	defer C.free(unsafe.Pointer(cDisp))
	C.clear_x11_root(cDisp)
}

func (sess *session) stopXvfbLocked() {
	if sess.xvfbCmd != nil && sess.xvfbCmd.Process != nil {
		_ = syscall.Kill(-sess.xvfbCmd.Process.Pid, syscall.SIGTERM)
		_ = syscall.Kill(-sess.xvfbCmd.Process.Pid, syscall.SIGKILL)
		_ = sess.xvfbCmd.Process.Kill()
		_, _ = sess.xvfbCmd.Process.Wait()
	}
	sess.xvfbCmd = nil
}

func (sess *session) ensureXvfbLocked(width, height int) error {
	if sess.xvfbCmd != nil && sess.xvfbCmd.Process != nil {
		if sess.width == width && sess.height == height {
			if err := sess.xvfbCmd.Process.Signal(syscall.Signal(0)); err == nil {
				return nil
			}
		}
		// Geometry changed or the server died: tear down and start fresh.
		sess.stopHackLocked()
		sess.stopXvfbLocked()
	}

	// A previous run may have left its Xvfb (and the hacks drawing into it) alive.
	// Starting a second server on the same display fails silently and the new hack
	// would draw next to the old ones, so evict the old server first.
	killStaleXvfb(sess.displayNum)

	// Clean up any stale lock files for this display
	_ = os.Remove(fmt.Sprintf("/tmp/.X%d-lock", sess.displayNum))
	_ = os.Remove(fmt.Sprintf("/tmp/.X11-unix/X%d", sess.displayNum))

	disp := sess.displayString()
	geom := fmt.Sprintf("%dx%dx24", width, height)
	cmd := exec.Command("Xvfb", disp, "-screen", "0", geom, "-nolisten", "tcp", "+extension", "GLX")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true, Pdeathsig: syscall.SIGKILL}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start Xvfb on %s: %w", disp, err)
	}
	sess.xvfbCmd = cmd
	sess.width = width
	sess.height = height
	time.Sleep(250 * time.Millisecond)
	return nil
}

// killStaleXvfb kills the Xvfb recorded in the display's lock file, if any.
// Its X clients exit when the server goes away.
func killStaleXvfb(displayNum int) {
	data, err := os.ReadFile(fmt.Sprintf("/tmp/.X%d-lock", displayNum))
	if err != nil {
		return
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil || pid <= 1 {
		return
	}
	comm, err := os.ReadFile(fmt.Sprintf("/proc/%d/comm", pid))
	if err != nil || strings.TrimSpace(string(comm)) != "Xvfb" {
		return
	}
	_ = syscall.Kill(pid, syscall.SIGKILL)
	for i := 0; i < 20; i++ {
		if err := syscall.Kill(pid, syscall.Signal(0)); err != nil {
			return
		}
		time.Sleep(25 * time.Millisecond)
	}
}

func (sess *session) stopHackLocked() {
	if sess.hackCmd != nil && sess.hackCmd.Process != nil {
		_ = syscall.Kill(-sess.hackCmd.Process.Pid, syscall.SIGTERM)
		_ = syscall.Kill(-sess.hackCmd.Process.Pid, syscall.SIGKILL)
		_ = sess.hackCmd.Process.Kill()
		_, _ = sess.hackCmd.Process.Wait()
	}
	sess.hackCmd = nil
	sess.activeSaver = ""
	sess.activeArgs = ""
}

// ensureRunning starts Xvfb and launches the requested XScreenSaver binary on the virtual root window.
func (sess *session) ensureRunning(saver models.Screensaver, values map[string]any, width, height int) error {
	if saver.BinaryPath == "" {
		return fmt.Errorf("saver %s has no binary path", saver.ID)
	}

	sess.mu.Lock()
	defer sess.mu.Unlock()

	if err := sess.ensureXvfbLocked(width, height); err != nil {
		return err
	}

	args := BuildCommandArgs(saver, values)
	argsKey := fmt.Sprintf("%v", args)

	if sess.activeSaver == saver.ID && sess.activeArgs == argsKey && sess.hackCmd != nil && sess.hackCmd.Process != nil {
		if err := sess.hackCmd.Process.Signal(syscall.Signal(0)); err == nil {
			return nil
		}
	}

	sess.stopHackLocked()
	sess.clearRootWindow()

	cmd := exec.Command("nice", append([]string{"-n", "10", saver.BinaryPath}, args...)...)
	env := os.Environ()
	env = append(env, "DISPLAY="+sess.displayString())
	cmd.Env = env
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true, Pdeathsig: syscall.SIGKILL}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start xscreensaver binary %s: %w", saver.BinaryPath, err)
	}

	sess.hackCmd = cmd
	sess.activeSaver = saver.ID
	sess.activeArgs = argsKey

	go func(targetCmd *exec.Cmd) {
		_ = targetCmd.Wait()
		sess.mu.Lock()
		defer sess.mu.Unlock()
		if sess.hackCmd == targetCmd {
			sess.hackCmd = nil
			sess.activeSaver = ""
			sess.activeArgs = ""
		}
	}(cmd)

	time.Sleep(100 * time.Millisecond)
	return nil
}

func (sess *session) registerClientStream(clientID string, parent context.Context) (context.Context, context.CancelFunc) {
	if clientID == "" {
		clientID = "default"
	}
	sess.mu.Lock()
	defer sess.mu.Unlock()

	if prevCancel, exists := sess.activeStreams[clientID]; exists && prevCancel != nil {
		prevCancel()
	}
	ctx, cancel := context.WithCancel(parent)
	sess.activeStreams[clientID] = cancel
	return ctx, cancel
}

// StopClient cancels any active stream for the given client in the given session and stops
// that session's hack if no streams remain.
func (s *Streamer) StopClient(sessionKey, clientID string) {
	if clientID == "" {
		clientID = "default"
	}
	sess := s.sessionFor(sessionKey)
	sess.mu.Lock()
	defer sess.mu.Unlock()
	if cancel, ok := sess.activeStreams[clientID]; ok && cancel != nil {
		cancel()
		delete(sess.activeStreams, clientID)
	}
	if len(sess.activeStreams) == 0 {
		sess.stopHackLocked()
	}
}

// ServeMJPEG streams live frames from the session's Xvfb display as multipart/x-mixed-replace MJPEG.
// sessionKey is typically the monitor name; width and height are the desired stream geometry
// (zero selects the default), limited to maxDim pixels on the long edge.
func (s *Streamer) ServeMJPEG(w http.ResponseWriter, r *http.Request, saver models.Screensaver, values map[string]any, fps int, sessionKey string, width, height, maxDim int) {
	sess := s.sessionFor(sessionKey)
	width, height = normalizeSize(width, height, maxDim)

	clientID := r.URL.Query().Get("client")
	streamCtx, cancelStream := sess.registerClientStream(clientID, r.Context())
	defer cancelStream()

	if err := sess.ensureRunning(saver, values, width, height); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if fps <= 0 || fps > 60 {
		fps = 30
	}

	w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary=ffmpeg")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	w.Header().Set("Connection", "close")

	disp := fmt.Sprintf("%s.0", sess.displayString())
	size := fmt.Sprintf("%dx%d", width, height)
	rate := fmt.Sprintf("%d", fps)
	// Run at low priority so the hack and encoder never starve the UI.
	ffCmd := exec.CommandContext(streamCtx,
		"nice", "-n", "10", "ffmpeg",
		"-loglevel", "error",
		"-f", "x11grab",
		"-draw_mouse", "0",
		"-framerate", rate,
		"-video_size", size,
		"-i", disp,
		"-pix_fmt", "yuvj420p",
		"-threads", "4",
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

	doneCh := make(chan struct{})
	go func() {
		select {
		case <-streamCtx.Done():
			if ffCmd.Process != nil {
				_ = syscall.Kill(-ffCmd.Process.Pid, syscall.SIGKILL)
				_ = ffCmd.Process.Kill()
			}
		case <-doneCh:
		}
	}()

	defer func() {
		close(doneCh)
		if ffCmd.Process != nil {
			_ = syscall.Kill(-ffCmd.Process.Pid, syscall.SIGKILL)
			_ = ffCmd.Process.Kill()
		}
		_ = ffCmd.Wait()
	}()

	_, _ = io.Copy(w, stdout)
}

// StopAll terminates every running XScreenSaver hack and Xvfb server.
func (s *Streamer) StopAll() {
	for _, sess := range s.allSessions() {
		sess.mu.Lock()
		for k, cancel := range sess.activeStreams {
			if cancel != nil {
				cancel()
			}
			delete(sess.activeStreams, k)
		}
		sess.stopHackLocked()
		sess.stopXvfbLocked()
		sess.mu.Unlock()
	}
}
