package layershell

/*
#cgo pkg-config: gtk+-3.0 webkit2gtk-4.1 gtk-layer-shell-0
#include <gtk/gtk.h>
#include <gdk/gdk.h>
#include <webkit2/webkit2.h>
#include <gtk-layer-shell/gtk-layer-shell.h>
#include <stdlib.h>

static int gtk_loop_active = 0;
static int layer_is_wallpaper = 0;
static GtkWidget *lock_windows[16];
static int lock_window_count = 0;
static GtkWidget *layer_windows[16];
static int layer_window_count = 0;
static GtkWidget *layer_webviews[16];
static int layer_webview_count = 0;
static int active_monitor_idx = 0;

static void apply_wallpaper_pass_through(GtkWidget *widget, gpointer user_data) {
    (void)user_data;
    if (widget == NULL) return;
    cairo_region_t *empty = cairo_region_create();
    gtk_widget_input_shape_combine_region(widget, empty);
    GdkWindow *gdk_win = gtk_widget_get_window(widget);
    if (gdk_win != NULL) {
        gdk_window_input_shape_combine_region(gdk_win, empty, 0, 0);
        gdk_window_set_pass_through(gdk_win, TRUE);
    }
    cairo_region_destroy(empty);
}

static void destroy_all_layer_windows(void) {
    for (int i = 0; i < layer_webview_count; i++) {
        layer_webviews[i] = NULL;
    }
    layer_webview_count = 0;
    for (int i = 0; i < layer_window_count; i++) {
        if (layer_windows[i] != NULL) {
            GtkWidget *w = layer_windows[i];
            layer_windows[i] = NULL;
            gtk_widget_destroy(w);
        }
    }
    layer_window_count = 0;
    lock_window_count = 0;
    GdkDisplay *display = gdk_display_get_default();
    if (display != NULL) {
        gdk_display_flush(display);
    }
}

static gboolean on_window_delete_event(GtkWidget *widget, GdkEvent *event, gpointer user_data) {
    (void)widget;
    (void)event;
    (void)user_data;
    return TRUE;
}

static void on_layer_window_destroy(GtkWidget *widget, gpointer user_data) {
    (void)user_data;
    for (int i = 0; i < layer_window_count; i++) {
        if (layer_windows[i] == widget) {
            layer_windows[i] = NULL;
            if (i < layer_webview_count) {
                layer_webviews[i] = NULL;
            }
        }
    }
    for (int i = 0; i < lock_window_count; i++) {
        if (lock_windows[i] == widget) {
            lock_windows[i] = NULL;
        }
    }
}

static gint64 last_wake_eval_us = 0;

static void focus_lock_window(GtkWidget *target_win, GtkWidget *webview) {
    if (layer_is_wallpaper || !gtk_layer_is_supported()) return;
    int target_idx = -1;
    for (int i = 0; i < layer_window_count; i++) {
        if (layer_windows[i] != NULL && layer_windows[i] == target_win) {
            target_idx = i;
            break;
        }
    }
    if (target_idx != -1 && target_idx != active_monitor_idx) {
        active_monitor_idx = target_idx;
        for (int i = 0; i < layer_window_count; i++) {
            if (layer_windows[i] != NULL && i != target_idx) {
                gtk_layer_set_keyboard_mode(
                    GTK_WINDOW(layer_windows[i]),
                    GTK_LAYER_SHELL_KEYBOARD_MODE_ON_DEMAND
                );
            }
        }
        if (target_win != NULL) {
            gtk_layer_set_keyboard_mode(
                GTK_WINDOW(target_win),
                GTK_LAYER_SHELL_KEYBOARD_MODE_EXCLUSIVE
            );
        }
    }
    if (webview != NULL && !gtk_widget_has_focus(webview)) {
        gtk_widget_grab_focus(webview);
    }
}

static void notify_all_webviews_wake(void) {
    if (layer_is_wallpaper) return;
    gint64 now = g_get_monotonic_time();
    if (now - last_wake_eval_us < 500000) {
        return;
    }
    last_wake_eval_us = now;
    for (int i = 0; i < layer_webview_count; i++) {
        if (layer_webviews[i] != NULL) {
            webkit_web_view_evaluate_javascript(
                WEBKIT_WEB_VIEW(layer_webviews[i]),
                "if(window.__wssWake)window.__wssWake();",
                -1, NULL, NULL, NULL, NULL, NULL
            );
        }
    }
}

static gboolean wake_idle_cb(gpointer data) {
    (void)data;
    if (gtk_loop_active && !layer_is_wallpaper) {
        if (layer_window_count > 0) {
            int idx = active_monitor_idx;
            if (idx < 0 || idx >= layer_window_count) {
                idx = 0;
            }
            if (gtk_layer_is_supported() && layer_windows[idx] != NULL) {
                gtk_layer_set_keyboard_mode(
                    GTK_WINDOW(layer_windows[idx]),
                    GTK_LAYER_SHELL_KEYBOARD_MODE_EXCLUSIVE
                );
            }
            focus_lock_window(layer_windows[idx], layer_webviews[idx]);
        }
        notify_all_webviews_wake();
    }
    return FALSE;
}

static void request_gtk_wake_all(void) {
    if (gtk_loop_active && !layer_is_wallpaper) {
        g_idle_add(wake_idle_cb, NULL);
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

static void on_window_map(GtkWidget *widget, gpointer user_data) {
    GtkWidget *webview = GTK_WIDGET(user_data);
    if (webview != NULL) {
        gtk_widget_grab_focus(webview);
    }
}

static gboolean on_lock_enter(GtkWidget *widget, GdkEventCrossing *event, gpointer user_data) {
    GtkWidget *win = gtk_widget_get_toplevel(widget);
    focus_lock_window(win, GTK_WIDGET(user_data));
    notify_all_webviews_wake();
    return FALSE;
}

static gboolean on_lock_motion(GtkWidget *widget, GdkEventMotion *event, gpointer user_data) {
    GtkWidget *webview = GTK_WIDGET(user_data);
    GtkWidget *win = gtk_widget_get_toplevel(widget);
    if (win != NULL && layer_windows[active_monitor_idx] != win) {
        focus_lock_window(win, webview);
    } else if (webview != NULL && !gtk_widget_has_focus(webview)) {
        gtk_widget_grab_focus(webview);
    }
    notify_all_webviews_wake();
    return FALSE;
}

static gboolean on_lock_click(GtkWidget *widget, GdkEventButton *event, gpointer user_data) {
    GtkWidget *win = gtk_widget_get_toplevel(widget);
    focus_lock_window(win, GTK_WIDGET(user_data));
    notify_all_webviews_wake();
    return FALSE;
}

static gboolean on_lock_key(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
    GtkWidget *webview = GTK_WIDGET(user_data);
    GtkWidget *win = gtk_widget_get_toplevel(widget);
    focus_lock_window(win, webview);
    notify_all_webviews_wake();
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
    layer_is_wallpaper = is_wallpaper ? 1 : 0;
    lock_window_count = 0;
    layer_window_count = 0;
    layer_webview_count = 0;

    GdkDisplay *display = gdk_display_get_default();
    int n_monitors = 1;
    if (display != NULL) {
        n_monitors = gdk_display_get_n_monitors(display);
        if (n_monitors < 1) {
            n_monitors = 1;
        }
    }

    int primary_idx = n_monitors / 2;
    if (primary_idx >= n_monitors) {
        primary_idx = 0;
    }
    active_monitor_idx = primary_idx;

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
            } else {
                gtk_layer_set_layer(GTK_WINDOW(window), GTK_LAYER_SHELL_LAYER_OVERLAY);
                gtk_layer_set_exclusive_zone(GTK_WINDOW(window), -1);
                gtk_layer_set_keyboard_mode(
                    GTK_WINDOW(window),
                    (i == primary_idx)
                        ? GTK_LAYER_SHELL_KEYBOARD_MODE_EXCLUSIVE
                        : GTK_LAYER_SHELL_KEYBOARD_MODE_ON_DEMAND
                );
                gtk_layer_set_namespace(GTK_WINDOW(window), is_locked ? "wscreensavers-lock" : "wscreensavers-saver");
            }

            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_TOP, TRUE);
            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_BOTTOM, TRUE);
            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_LEFT, TRUE);
            gtk_layer_set_anchor(GTK_WINDOW(window), GTK_LAYER_SHELL_EDGE_RIGHT, TRUE);
        } else {
            gtk_window_fullscreen(GTK_WINDOW(window));
        }

        WebKitWebContext *web_ctx = webkit_web_context_get_default();
        if (web_ctx != NULL) {
            webkit_web_context_set_cache_model(web_ctx, WEBKIT_CACHE_MODEL_DOCUMENT_VIEWER);
        }

        WebKitSettings *settings = webkit_settings_new();
        webkit_settings_set_enable_webgl(settings, TRUE);
        webkit_settings_set_enable_webaudio(settings, FALSE);
        webkit_settings_set_enable_page_cache(settings, FALSE);
        webkit_settings_set_hardware_acceleration_policy(settings, WEBKIT_HARDWARE_ACCELERATION_POLICY_ALWAYS);

        GtkWidget *webview = webkit_web_view_new_with_settings(settings);
        if (layer_webview_count < 16) {
            layer_webviews[layer_webview_count++] = webview;
        }
        GdkRGBA bg = {0.0, 0.0, 0.0, 1.0};
        webkit_web_view_set_background_color(WEBKIT_WEB_VIEW(webview), &bg);

        const char *target_url = urls[0];
        if (i < url_count && urls[i] != NULL) {
            target_url = urls[i];
        }
        webkit_web_view_load_uri(WEBKIT_WEB_VIEW(webview), target_url);

        gtk_container_add(GTK_CONTAINER(window), webview);

        if (is_wallpaper) {
            gtk_window_set_accept_focus(GTK_WINDOW(window), FALSE);
            gtk_window_set_focus_on_map(GTK_WINDOW(window), FALSE);
            gtk_widget_set_can_focus(window, FALSE);
            gtk_widget_set_can_focus(webview, FALSE);
            g_signal_connect(window, "realize", G_CALLBACK(apply_wallpaper_pass_through), NULL);
            g_signal_connect(window, "map", G_CALLBACK(apply_wallpaper_pass_through), NULL);
            g_signal_connect(webview, "realize", G_CALLBACK(apply_wallpaper_pass_through), NULL);
            g_signal_connect(webview, "map", G_CALLBACK(apply_wallpaper_pass_through), NULL);
        } else if (!is_locked) {
            int *motion_counter = (int *)calloc(1, sizeof(int));
            gtk_widget_add_events(window, GDK_ENTER_NOTIFY_MASK | GDK_POINTER_MOTION_MASK | GDK_KEY_PRESS_MASK | GDK_BUTTON_PRESS_MASK);
            gtk_widget_add_events(webview, GDK_ENTER_NOTIFY_MASK | GDK_POINTER_MOTION_MASK | GDK_KEY_PRESS_MASK | GDK_BUTTON_PRESS_MASK);
            g_signal_connect(window, "map", G_CALLBACK(on_window_map), webview);
            g_signal_connect(window, "enter-notify-event", G_CALLBACK(on_lock_enter), webview);
            g_signal_connect(webview, "enter-notify-event", G_CALLBACK(on_lock_enter), webview);
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
        }

        g_signal_connect(window, "delete-event", G_CALLBACK(on_window_delete_event), NULL);
        g_signal_connect(window, "destroy", G_CALLBACK(on_layer_window_destroy), NULL);
        gtk_widget_show_all(window);
        if (is_wallpaper) {
            apply_wallpaper_pass_through(window, NULL);
            apply_wallpaper_pass_through(webview, NULL);
        } else if (i == primary_idx) {
            gtk_widget_grab_focus(webview);
        }
    }

    if (!is_wallpaper && layer_window_count > 0) {
        focus_lock_window(layer_windows[primary_idx], layer_webviews[primary_idx]);
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

var executablePathFunc = os.Executable

// RequestQuit signals the GTK main loop to destroy all layer-shell windows and exit cleanly.
func RequestQuit() {
	C.request_gtk_quit()
}

// WakeAllWindows signals all active layer-shell webviews across all monitors to wake up immediately.
func WakeAllWindows() {
	C.request_gtk_wake_all()
}

// RunLayerShellWindows initializes GTK + gtk-layer-shell and creates borderless Wayland surfaces across all monitors.
func RunLayerShellWindows(urls []string, isWallpaper bool, isLocked bool) {
	if len(urls) == 0 {
		return
	}
	if os.Getenv("WAYLAND_DISPLAY") != "" {
		_ = os.Setenv("GDK_BACKEND", "wayland")
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
	saverLocked   bool
	wallpaperProc *exec.Cmd
	wallpaperDone chan struct{}
	onSaverExit   func()
}

func NewProcessController(onSaverExit func()) *ProcessController {
	return &ProcessController{
		onSaverExit: onSaverExit,
	}
}

// IsLockRunning checks whether a child or standalone lock overlay process is alive.
func (p *ProcessController) IsLockRunning() bool {
	p.mu.Lock()
	cmd := p.saverProc
	locked := p.saverLocked
	p.mu.Unlock()
	if locked && cmd != nil && cmd.Process != nil {
		if err := syscall.Kill(cmd.Process.Pid, 0); err == nil {
			return true
		}
	}
	out, err := exec.Command("pgrep", "-f", "wscreensavers.*--lock([[:space:]]|$)").Output()
	return err == nil && len(strings.TrimSpace(string(out))) > 0
}

// IsSaverRunning checks whether a child screensaver/lock overlay or standalone overlay process is alive.
func (p *ProcessController) IsSaverRunning() bool {
	p.mu.Lock()
	cmd := p.saverProc
	p.mu.Unlock()
	if cmd != nil && cmd.Process != nil {
		if err := syscall.Kill(cmd.Process.Pid, 0); err == nil {
			return true
		}
	}
	out, err := exec.Command("pgrep", "-f", "wscreensavers.*--(saver|lock)([[:space:]]|$)").Output()
	return err == nil && len(strings.TrimSpace(string(out))) > 0
}

func (p *ProcessController) StartSaverOverlay(baseURL string, saverID string, locked bool) error {
	// Never terminate or replace an already-active lock screen process.
	if p.IsLockRunning() {
		return nil
	}
	p.stopSaverOnly()
	p.StopWallpaper()

	exe, err := executablePathFunc()
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
	if !locked {
		_ = syscall.Setpriority(syscall.PRIO_PROCESS, cmd.Process.Pid, 10)
	}

	done := make(chan struct{})
	p.mu.Lock()
	p.saverProc = cmd
	p.saverDone = done
	p.saverLocked = locked
	p.mu.Unlock()

	go func() {
		_ = cmd.Wait()
		close(done)
		p.mu.Lock()
		exitedOnItsOwn := p.saverProc == cmd
		if exitedOnItsOwn {
			p.saverProc = nil
			p.saverDone = nil
			p.saverLocked = false
		}
		p.mu.Unlock()
		// A process we replaced or stopped must not mark the screensaver inactive.
		if exitedOnItsOwn && p.onSaverExit != nil {
			p.onSaverExit()
		}
	}()

	return nil
}

func (p *ProcessController) stopSaverOnly() {
	p.mu.Lock()
	cmd := p.saverProc
	done := p.saverDone
	locked := p.saverLocked
	if !locked {
		p.saverProc = nil
		p.saverDone = nil
		p.saverLocked = false
	}
	p.mu.Unlock()

	if !locked && cmd != nil && cmd.Process != nil && done != nil {
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
	StopMatchingSaverOnlyProcesses()
}

func (p *ProcessController) StopSaverOverlay() {
	C.request_gtk_quit()
	p.mu.Lock()
	cmd := p.saverProc
	done := p.saverDone
	p.saverProc = nil
	p.saverDone = nil
	p.saverLocked = false
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
	StopMatchingSaverProcesses()
}

func stopProcessesMatchingPattern(pattern string) {
	out, err := exec.Command("pgrep", "-f", pattern).Output()
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
			_ = syscall.Kill(-pid, syscall.SIGTERM)
			_ = syscall.Kill(pid, syscall.SIGTERM)
			killed = append(killed, pid)
		}
	}
	if len(killed) > 0 {
		deadline := time.Now().Add(350 * time.Millisecond)
		for time.Now().Before(deadline) {
			alive := false
			for _, pid := range killed {
				if err := syscall.Kill(pid, 0); err == nil {
					alive = true
					break
				}
			}
			if !alive {
				return
			}
			time.Sleep(15 * time.Millisecond)
		}
		for _, pid := range killed {
			_ = syscall.Kill(-pid, syscall.SIGKILL)
			_ = syscall.Kill(pid, syscall.SIGKILL)
		}
	}
}

func StopMatchingSaverOnlyProcesses() {
	stopProcessesMatchingPattern("wscreensavers.*--saver([[:space:]]|$)")
}

func StopMatchingSaverProcesses() {
	stopProcessesMatchingPattern("wscreensavers.*--(saver|lock)([[:space:]]|$)")
}

func (p *ProcessController) StartWallpaper(baseURL string, saverID string) error {
	if p.IsSaverRunning() || p.IsLockRunning() {
		return nil
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	p.stopWallpaperLocked()

	exe, err := executablePathFunc()
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
	_ = syscall.Setpriority(syscall.PRIO_PROCESS, cmd.Process.Pid, 19)

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
	stopProcessesMatchingPattern("wscreensavers.*--wallpaper([[:space:]]|$)")
}

func (p *ProcessController) StopAll() {
	p.StopSaverOverlay()
	p.StopWallpaper()
}
