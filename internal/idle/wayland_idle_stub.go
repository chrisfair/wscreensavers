//go:build !linux || !cgo

package idle

type waylandIdleListener struct{}

func startWaylandIdleListener(timeoutMs int, onIdle func(), onResume func()) *waylandIdleListener {
	return nil
}

func (l *waylandIdleListener) Stop() {}
