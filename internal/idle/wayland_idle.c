#define _GNU_SOURCE
#include "wayland_idle.h"
#include "ext-idle-notify-v1-client-protocol.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <poll.h>
#include <fcntl.h>
#include <errno.h>
#include <wayland-client.h>

struct wayland_idle_state {
    struct wl_display *display;
    struct wl_registry *registry;
    struct ext_idle_notifier_v1 *notifier;
    struct wl_seat *seat;
    struct ext_idle_notification_v1 *notification;
    int event_flag; // 1 = idled, 2 = resumed
    int stop_pipe[2];
    int wl_fd;
};

static void handle_idled(void *data, struct ext_idle_notification_v1 *n) {
    (void)n;
    wayland_idle_t *state = (wayland_idle_t *)data;
    if (state) state->event_flag = 1;
}

static void handle_resumed(void *data, struct ext_idle_notification_v1 *n) {
    (void)n;
    wayland_idle_t *state = (wayland_idle_t *)data;
    if (state) state->event_flag = 2;
}

static const struct ext_idle_notification_v1_listener notification_listener = {
    .idled = handle_idled,
    .resumed = handle_resumed,
};

static void registry_global(void *data, struct wl_registry *registry,
                            uint32_t name, const char *interface, uint32_t version) {
    (void)version;
    wayland_idle_t *state = (wayland_idle_t *)data;
    if (!state) return;
    if (strcmp(interface, ext_idle_notifier_v1_interface.name) == 0) {
        state->notifier = (struct ext_idle_notifier_v1 *)wl_registry_bind(
            registry, name, &ext_idle_notifier_v1_interface, 1);
    } else if (strcmp(interface, wl_seat_interface.name) == 0) {
        if (!state->seat) {
            state->seat = (struct wl_seat *)wl_registry_bind(
                registry, name, &wl_seat_interface, 1);
        }
    }
}

static void registry_global_remove(void *data, struct wl_registry *registry, uint32_t name) {
    (void)data;
    (void)registry;
    (void)name;
}

static const struct wl_registry_listener registry_listener = {
    .global = registry_global,
    .global_remove = registry_global_remove,
};

wayland_idle_t *wayland_idle_init(int timeout_ms) {
    wayland_idle_t *state = (wayland_idle_t *)calloc(1, sizeof(wayland_idle_t));
    if (!state) return NULL;
    state->stop_pipe[0] = -1;
    state->stop_pipe[1] = -1;

    state->display = wl_display_connect(NULL);
    if (!state->display) {
        free(state);
        return NULL;
    }

    state->registry = wl_display_get_registry(state->display);
    wl_registry_add_listener(state->registry, &registry_listener, state);
    if (wl_display_roundtrip(state->display) < 0) {
        wl_display_disconnect(state->display);
        free(state);
        return NULL;
    }

    if (!state->notifier || !state->seat) {
        if (state->notifier) ext_idle_notifier_v1_destroy(state->notifier);
        if (state->seat) wl_seat_destroy(state->seat);
        if (state->registry) wl_registry_destroy(state->registry);
        wl_display_disconnect(state->display);
        free(state);
        return NULL;
    }

    if (pipe2(state->stop_pipe, O_NONBLOCK | O_CLOEXEC) < 0) {
        state->stop_pipe[0] = -1;
        state->stop_pipe[1] = -1;
    }

    state->notification = ext_idle_notifier_v1_get_idle_notification(
        state->notifier, (uint32_t)timeout_ms, state->seat);
    ext_idle_notification_v1_add_listener(state->notification, &notification_listener, state);
    wl_display_roundtrip(state->display);
    state->wl_fd = wl_display_get_fd(state->display);

    return state;
}

int wayland_idle_poll(wayland_idle_t *state, int timeout_ms) {
    if (!state || !state->display) return -1;

    state->event_flag = 0;

    // Dispatch any previously buffered events
    while (wl_display_prepare_read(state->display) != 0) {
        wl_display_dispatch_pending(state->display);
        if (state->event_flag != 0) {
            return state->event_flag;
        }
    }

    if (wl_display_flush(state->display) < 0) {
        wl_display_cancel_read(state->display);
        return -1;
    }

    struct pollfd pfds[2];
    int nfds = 1;
    pfds[0].fd = state->wl_fd;
    pfds[0].events = POLLIN;
    pfds[0].revents = 0;

    if (state->stop_pipe[0] >= 0) {
        pfds[1].fd = state->stop_pipe[0];
        pfds[1].events = POLLIN;
        pfds[1].revents = 0;
        nfds = 2;
    }

    int ret = poll(pfds, nfds, timeout_ms);
    if (ret < 0) {
        wl_display_cancel_read(state->display);
        if (errno == EINTR) {
            return 0;
        }
        return -1;
    }

    if (nfds > 1 && (pfds[1].revents & POLLIN)) {
        wl_display_cancel_read(state->display);
        return -2;
    }

    if (ret > 0 && (pfds[0].revents & POLLIN)) {
        if (wl_display_read_events(state->display) < 0) {
            return -1;
        }
        wl_display_dispatch_pending(state->display);
    } else {
        wl_display_cancel_read(state->display);
    }

    return state->event_flag;
}

void wayland_idle_stop(wayland_idle_t *state) {
    if (!state) return;
    if (state->stop_pipe[1] >= 0) {
        char b = 1;
        (void)write(state->stop_pipe[1], &b, 1);
    }
}

void wayland_idle_free(wayland_idle_t *state) {
    if (!state) return;
    wayland_idle_stop(state);
    if (state->notification) {
        ext_idle_notification_v1_destroy(state->notification);
        state->notification = NULL;
    }
    if (state->notifier) {
        ext_idle_notifier_v1_destroy(state->notifier);
        state->notifier = NULL;
    }
    if (state->seat) {
        wl_seat_destroy(state->seat);
        state->seat = NULL;
    }
    if (state->registry) {
        wl_registry_destroy(state->registry);
        state->registry = NULL;
    }
    if (state->display) {
        wl_display_disconnect(state->display);
        state->display = NULL;
    }
    if (state->stop_pipe[0] >= 0) close(state->stop_pipe[0]);
    if (state->stop_pipe[1] >= 0) close(state->stop_pipe[1]);
    free(state);
}
