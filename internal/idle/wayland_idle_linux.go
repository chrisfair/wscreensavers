//go:build linux && cgo

package idle

/*
#cgo pkg-config: wayland-client
#include "wayland_idle.h"
*/
import "C"
import (
	"sync"
)

type waylandIdleListener struct {
	state   *C.wayland_idle_t
	mu      sync.Mutex
	stopCh  chan struct{}
	stopped bool
}

func startWaylandIdleListener(timeoutMs int, onIdle func(), onResume func()) *waylandIdleListener {
	state := C.wayland_idle_init(C.int(timeoutMs))
	if state == nil {
		return nil
	}
	l := &waylandIdleListener{
		state:  state,
		stopCh: make(chan struct{}),
	}

	go func() {
		defer func() {
			l.mu.Lock()
			st := l.state
			l.state = nil
			l.mu.Unlock()
			if st != nil {
				C.wayland_idle_free(st)
			}
		}()

		for {
			select {
			case <-l.stopCh:
				return
			default:
				ev := C.wayland_idle_poll(l.state, 500)
				if ev == 1 {
					onIdle()
				} else if ev == 2 {
					onResume()
				} else if ev < 0 {
					return
				}
			}
		}
	}()

	return l
}

func (l *waylandIdleListener) Stop() {
	l.mu.Lock()
	if l.stopped {
		l.mu.Unlock()
		return
	}
	l.stopped = true
	st := l.state
	l.mu.Unlock()

	if st != nil {
		C.wayland_idle_stop(st)
	}
	close(l.stopCh)
}
