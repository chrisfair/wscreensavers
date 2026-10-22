#ifndef WAYLAND_IDLE_H
#define WAYLAND_IDLE_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct wayland_idle_state wayland_idle_t;

// Initialize Wayland ext-idle-notify-v1 client. Returns NULL if Wayland display
// is unavailable or compositor does not support ext-idle-notify-v1.
wayland_idle_t *wayland_idle_init(int timeout_ms);

// Poll for idle events with given timeout in milliseconds.
// Returns:
//   1  = user became idle (IDLED event received)
//   2  = user activity detected (RESUMED event received)
//   0  = poll timeout, no event
//  -1  = Wayland display error or disconnect
//  -2  = stop requested via wayland_idle_stop()
int wayland_idle_poll(wayland_idle_t *state, int timeout_ms);

// Signal poll loop to stop immediately.
void wayland_idle_stop(wayland_idle_t *state);

// Free all resources associated with wayland_idle_t.
void wayland_idle_free(wayland_idle_t *state);

#ifdef __cplusplus
}
#endif

#endif // WAYLAND_IDLE_H
