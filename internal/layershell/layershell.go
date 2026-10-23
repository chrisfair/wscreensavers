package layershell

/*
#cgo pkg-config: gtk+-3.0 webkit2gtk-4.1 gtk-layer-shell-0
#include <gtk/gtk.h>
#include <gdk/gdk.h>
#include <webkit2/webkit2.h>
#include <gtk-layer-shell/gtk-layer-shell.h>
#include <stdlib.h>

static int gtk_loop_active = 0;
static GtkWidget *lock_windows[16];
static int lock_window_count = 0;
static GtkWidget *layer_windows[16];
static int layer_window_count = 0;

static void destroy_all_layer_windows(void) {
    for (int i = 0; i < layer_window_count; i++) {
        if (layer_windows[i] != NULL) {
            gtk_widget_destroy(layer_windows[i]);
            layer_windows[i] = NULL;
        }
    }
    layer_window_count = 0;
    lock_window_count = 0;
    GdkDisplay *display = gdk_display_get_default();
    if (display != NULL) {
        gdk_display_flush(display);
    }
}

static gboolean quit_idle_cb(gpointer data) {
    if (gtk_loop_active) {
        gtk_loop_active = 0;
        destroy_all_layer_windows();
        gtk_main_quit();
    }
    return FALSE;
}

static void request_gtk_quit(void) {
    if (gtk_loop_active) {
        g_idle_add(quit_idle_cb, NULL);
    }
}

static void focus_lock_window(GtkWidget *target_win, GtkWidget *webview) {
    if (!gtk_layer_is_supported()) return;
    for (int i = 0; i < lock_window_count; i++) {
        if (lock_windows[i] != NULL) {
            gtk_layer_set_keyboard_mode(
                GTK_WINDOW(lock_windows[i]),
                GTK_LAYER_SHELL_KEYBOARD_MODE_EXCLUSIVE
            );
        }
    }
    if (webview != NULL) {
        gtk_widget_grab_focus(webview);
    }
}

static void on_window_map(GtkWidget *widget, gpointer user_data) {
    GtkWidget *webview = GTK_WIDGET(user_data);
    if (webview != NULL) {
        gtk_widget_grab_focus(webview);
    }
}

static gboolean on_lock_enter(GtkWidget *widget, GdkEventCrossing *event, gpointer user_data) {
    GtkWidget *win = gtk_widget_get_toplevel(widget);
    focus_lock_window(win, GTK_WIDGET(user_data));
    return FALSE;
}

static gboolean on_lock_motion(GtkWidget *widget, GdkEventMotion *event, gpointer user_data) {
    GtkWidget *webview = GTK_WIDGET(user_data);
    if (webview != NULL && !gtk_widget_has_focus(webview)) {
        gtk_widget_grab_focus(webview);
    }
    return FALSE;
}

static gboolean on_lock_click(GtkWidget *widget, GdkEventButton *event, gpointer user_data) {
    GtkWidget *win = gtk_widget_get_toplevel(widget);
    focus_lock_window(win, GTK_WIDGET(user_data));
    return FALSE;
}

static gboolean on_lock_key(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
    GtkWidget *webview = GTK_WIDGET(user_data);
    if (webview != NULL && !gtk_widget_has_focus(webview)) {
        gtk_widget_grab_focus(webview);
    }
    return FALSE;
}

static gboolean on_motion_dismiss(GtkWidget *widget, GdkEventMotion *event, gpointer user_data) {
    int *first_move = (int *)user_data;
    if (*first_move < 3) {
        (*first_move)++;
        return FALSE;
    }
    request_gtk_quit();
    return TRUE;
}

static gboolean on_key_dismiss(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
    request_gtk_quit();
    return TRUE;
}

static gboolean on_button_dismiss(GtkWidget *widget, GdkEventButton *event, gpointer user_data) {
    request_gtk_quit();
    return TRUE;
}

static void launch_layer_windows(const char **urls, int url_count, int is_wallpaper, int is_locked) {
    gtk_init(NULL, NULL);
    lock_window_count = 0;
    layer_window_count = 0;

    GdkDisplay *display = gdk_display_get_default();
    int n_monitors = 1;
    if (display != NULL) {
        n_monitors = gdk_display_get_n_monitors(display);
        if (n_monitors < 1) {
            n_monitors = 1;
        }
    }

    int primary_idx = n_monitors / 2;

    for (int i = 0; i < n_monitors; i++) {
        GtkWidget *window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
        gtk_window_set_decorated(GTK_WINDOW(window), FALSE);

        if (layer_window_count < 16) {
            layer_windows[layer_window_count++] = window;
        }

        if (is_locked && lock_window_count < 16) {
            lock_windows[lock_window_count++] = window;
        }

        if (gtk_layer_is_supported()) {
            gtk_layer_init_for_window(GTK_WINDOW(window));

            if (display != NULL && i < gdk_display_get_n_monitors(display)) {
                GdkMonitor *mon = gdk_display_get_monitor(display, i);
                if (mon != NULL) {
                    gtk_layer_set_monitor(GTK_WINDOW(window), mon);
                }
            }

            if (is_wallpaper) {
                gtk_layer_set_layer(GTK_WINDOW(window), GTK_LAYER_SHELL_LAYER_BACKGROUND);
                gtk_layer_set_exclusive_zone(GTK_WINDOW(window), -1);
                gtk_layer_set_keyboard_mode(GTK_WINDOW(window), GTK_LAYER_SHELL_KEYBOARD_MODE_NONE);
                gtk_layer_set_namespace(GTK_WINDOW(window), "wscreensavers-wallpaper");
            } else if (is_locked) {
                gtk_layer_set_layer(GTK_WINDOW(window), GTK_LAYER_SHELL_LAYER_OVERLAY);
                gtk_layer_set_exclusive_zone(GTK_WINDOW(window), -1);
                gtk_layer_set_keyboard_mode(GTK_WINDOW(window), GTK_LAYER_SHELL_KEYBOARD_MODE_EXCLUSIVE);
                gtk_layer_set_namespace(GTK_WINDOW(window), "wscreensavers-lock");
            } else {
                gtk_layer_set_layer(GTK_WINDOW(window), GTK_LAYER_SHELL_LAYER_OVERLAY);
                gtk_layer_set_exclusive_zone(GTK_WINDOW(window), -1);
                gtk_layer_set_keyboard_mode(GTK_WINDOW(window), GTK_LAYER_SHELL_KEYBOARD_MODE_ON_DEMAND);
                gtk_layer_set_namespace(GTK_WINDOW(window), "wscreensavers-saver");
            }

            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_TOP, TRUE);
            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_BOTTOM, TRUE);
            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_LEFT, TRUE);
            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_RIGHT, TRUE);
        } else {
            gtk_window_fullscreen(GTK_WINDOW(window));
        }

        WebKitSettings *settings = webkit_settings_new();
        webkit_settings_set_enable_webgl(settings, TRUE);
        webkit_settings_set_enable_webaudio(settings, TRUE);
        webkit_settings_set_hardware_acceleration_policy(settings, WEBKIT_HARDWARE_ACCELERATION_POLICY_ALWAYS);

        GtkWidget *webview = webkit_web_view_new_with_settings(settings);
        GdkRGBA bg = {0.0, 0.0, 0.0, 1.0};
        webkit_web_view_set_background_color(WEBKIT_WEB_VIEW(webview), &bg);

        const char *target_url = urls[0];
        if (i < url_count && urls[i] != NULL) {
            target_url = urls[i];
        }
        webkit_web_view_load_uri(WEBKIT_WEB_VIEW(webview), target_url);

        gtk_container_add(GTK_CONTAINER(window), webview);

        if (!is_wallpaper && !is_locked) {
            int *motion_counter = (int *)calloc(1, sizeof(int));
            gtk_widget_add_events(window, GDK_POINTER_MOTION_MASK | GDK_KEY_PRESS_MASK | GDK_BUTTON_PRESS_MASK);
            gtk_widget_add_events(webview, GDK_POINTER_MOTION_MASK | GDK_KEY_PRESS_MASK | GDK_BUTTON_PRESS_MASK);
            g_signal_connect(window, "motion-notify-event", G_CALLBACK(on_motion_dismiss), motion_counter);
            g_signal_connect(window, "key-press-event", G_CALLBACK(on_key_dismiss), NULL);
            g_signal_connect(window, "button-press-event", G_CALLBACK(on_button_dismiss), NULL);
            g_signal_connect(webview, "key-press-event", G_CALLBACK(on_key_dismiss), NULL);
            g_signal_connect(webview, "button-press-event", G_CALLBACK(on_button_dismiss), NULL);
        } else if (is_locked) {
            gtk_widget_add_events(window, GDK_ENTER_NOTIFY_MASK | GDK_BUTTON_PRESS_MASK | GDK_POINTER_MOTION_MASK | GDK_KEY_PRESS_MASK);
            gtk_widget_add_events(webview, GDK_ENTER_NOTIFY_MASK | GDK_BUTTON_PRESS_MASK | GDK_POINTER_MOTION_MASK | GDK_KEY_PRESS_MASK);
            g_signal_connect(window, "map", G_CALLBACK(on_window_map), webview);
            g_signal_connect(window, "enter-notify-event", G_CALLBACK(on_lock_enter), webview);
            g_signal_connect(webview, "enter-notify-event", G_CALLBACK(on_lock_enter), webview);
            g_signal_connect(window, "motion-notify-event", G_CALLBACK(on_lock_motion), webview);
            g_signal_connect(webview, "motion-notify-event", G_CALLBACK(on_lock_motion), webview);
            g_signal_connect(window, "button-press-event", G_CALLBACK(on_lock_click), webview);
            g_signal_connect(webview, "button-press-event", G_CALLBACK(on_lock_click), webview);
            g_signal_connect(window, "key-press-event", G_CALLBACK(on_lock_key), webview);
            g_signal_connect(webview, "key-press-event", G_CALLBACK(on_lock_key), webview);
        }

        g_signal_connect(window, "destroy", G_CALLBACK(gtk_main_quit), NULL);
        gtk_widget_show_all(window);
        if (is_locked) {
            gtk_widget_grab_focus(webview);
        }
    }

    gtk_loop_active = 1;
    gtk_main();
    gtk_loop_active = 0;
}
*/
import "C"

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// RequestQuit signals the GTK main loop to destroy all layer-shell windows and exit cleanly.
func RequestQuit() {
	C.request_gtk_quit()
}

// RunLayerShellWindows initializes GTK + gtk-layer-shell and creates borderless Wayland surfaces across all monitors.
func RunLayerShellWindows(urls []string, isWallpaper bool, isLocked bool) {
	if len(urls) == 0 {
		return
	}
	cURLs := make([]*C.char, len(urls))
	for i, u := range urls {
		cURLs[i] = C.CString(u)
		defer C.free(unsafe.Pointer(cURLs[i]))
	}
	wpFlag := C.int(0)
	if isWallpaper {
		wpFlag = 1
	}
	lockFlag := C.int(0)
	if isLocked {
		lockFlag = 1
	}
	C.launch_layer_windows(&cURLs[0], C.int(len(cURLs)), wpFlag, lockFlag)
}

// ProcessController manages child layer-shell overlay and wallpaper processes.
type ProcessController struct {
	mu            sync.Mutex
	saverProc     *exec.Cmd
	saverDone     chan struct{}
	wallpaperProc *exec.Cmd
	wallpaperDone chan struct{}
	onSaverExit   func()
}

func NewProcessController(onSaverExit func()) *ProcessController {
	return &ProcessController{
		onSaverExit: onSaverExit,
	}
}

func (p *ProcessController) StartSaverOverlay(baseURL string, saverID string, locked bool) error {
	p.StopSaverOverlay()
	p.StopWallpaper()

	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to resolve executable: %w", err)
	}

	modeFlag := "--saver"
	if locked {
		modeFlag = "--lock"
	}
	args := []string{modeFlag, "--server-url", baseURL}
	if saverID != "" {
		args = append(args, "--saver-id", saverID)
	}

	cmd := exec.Command(exe, args...)
	cmd.Env = os.Environ()
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if err := cmd.Start(); err != nil {
		return err
	}

	done := make(chan struct{})
	p.mu.Lock()
	p.saverProc = cmd
	p.saverDone = done
	p.mu.Unlock()

	go func() {
		_ = cmd.Wait()
		close(done)
		p.mu.Lock()
		exitedOnItsOwn := p.saverProc == cmd
		if exitedOnItsOwn {
			p.saverProc = nil
			p.saverDone = nil
		}
		p.mu.Unlock()
		// A process we replaced or stopped must not mark the screensaver inactive.
		if exitedOnItsOwn && p.onSaverExit != nil {
			p.onSaverExit()
		}
	}()

	return nil
}

func (p *ProcessController) StopSaverOverlay() {
	C.request_gtk_quit()
	p.mu.Lock()
	cmd := p.saverProc
	done := p.saverDone
	p.saverProc = nil
	p.saverDone = nil
	p.mu.Unlock()

	if cmd != nil && cmd.Process != nil && done != nil {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
		select {
		case <-done:
		case <-time.After(500 * time.Millisecond):
			_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
			select {
			case <-done:
			case <-time.After(500 * time.Millisecond):
			}
		}
	}
}

func (p *ProcessController) StartWallpaper(baseURL string, saverID string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.stopWallpaperLocked()

	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to resolve executable: %w", err)
	}

	args := []string{"--wallpaper", "--server-url", baseURL}
	if saverID != "" {
		args = append(args, "--saver-id", saverID)
	}

	cmd := exec.Command(exe, args...)
	cmd.Env = os.Environ()
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if err := cmd.Start(); err != nil {
		return err
	}

	done := make(chan struct{})
	p.wallpaperProc = cmd
	p.wallpaperDone = done

	go func() {
		_ = cmd.Wait()
		close(done)
		p.mu.Lock()
		if p.wallpaperProc == cmd {
			p.wallpaperProc = nil
			p.wallpaperDone = nil
		}
		p.mu.Unlock()
	}()

	return nil
}

func (p *ProcessController) StopWallpaper() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.stopWallpaperLocked()
}

func (p *ProcessController) stopWallpaperLocked() {
	cmd := p.wallpaperProc
	done := p.wallpaperDone
	p.wallpaperProc = nil
	p.wallpaperDone = nil

	if cmd != nil && cmd.Process != nil && done != nil {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
		select {
		case <-done:
		case <-time.After(500 * time.Millisecond):
			_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
			select {
			case <-done:
			case <-time.After(300 * time.Millisecond):
			}
		}
	}

	// Also terminate any stray or external wscreensavers --wallpaper processes on the system
	StopMatchingWallpaperProcesses()
}

// StopMatchingWallpaperProcesses terminates all running wscreensavers --wallpaper processes
// across the system and waits for them to exit so GPU and compositor resources are fully freed.
func StopMatchingWallpaperProcesses() {
	out, err := exec.Command("pgrep", "-f", "wscreensavers.*--wallpaper(\\s|$)").Output()
	if err != nil {
		return
	}
	currentPID := os.Getpid()
	var killed []int
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		pid, err := strconv.Atoi(line)
		if err == nil && pid > 0 && pid != currentPID {
			_ = syscall.Kill(pid, syscall.SIGTERM)
			killed = append(killed, pid)
		}
	}
	if len(killed) > 0 {
		deadline := time.Now().Add(250 * time.Millisecond)
		for time.Now().Before(deadline) {
			alive := false
			for _, pid := range killed {
				if err := syscall.Kill(pid, 0); err == nil {
					alive = true
					break
				}
			}
			if !alive {
				break
			}
			time.Sleep(15 * time.Millisecond)
		}
	}
}

func (p *ProcessController) StopAll() {
	p.StopSaverOverlay()
	p.StopWallpaper()
}
