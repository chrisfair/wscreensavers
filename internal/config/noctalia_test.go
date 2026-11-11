package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSyncNoctaliaIdleAtPath(t *testing.T) {
	tmp := t.TempDir()
	settingsFile := filepath.Join(tmp, "settings.toml")

	sampleTOML := `[idle]
behavior_order = [ "lock", "screen-off" ]
pre_action_fade_seconds = 30.0

    [idle.behavior.lock]
    action = "command"
    command = "/home/user/bin/wscreensavers --lock"
    enabled = true
    timeout = 540.0

    [idle.behavior.screen-off]
    action = "screen_off"
    enabled = true
    timeout = 600.0
`
	if err := os.WriteFile(settingsFile, []byte(sampleTOML), 0644); err != nil {
		t.Fatal(err)
	}

	cfg := DefaultConfig()
	cfg.Mode = "random"
	cfg.IdleTimeoutMinutes = 60
	cfg.DPMSOffMinutes = 60

	updates := make(map[string]string)
	SyncNoctaliaIdleAtPath(cfg, settingsFile, func(key, val string) {
		updates[key] = val
	})

	if updates["idle.behavior.lock.enabled"] != "false" || updates["idle.behavior.screen-off.enabled"] != "false" {
		t.Fatalf("expected conflicting Noctalia idle behaviors to be disabled, got %v", updates)
	}
	if updates["idle.behavior.lock.timeout"] != "3600.0" || updates["idle.behavior.screen-off.timeout"] != "7200.0" {
		t.Fatalf("expected synced timeouts 3600.0 and 7200.0, got %v", updates)
	}
	if updates["idle.behavior.lock.command"] != `"wscreensavers --lock"` {
		t.Fatalf("expected TOML-quoted command, got %v", updates["idle.behavior.lock.command"])
	}

	// Already disabled TOML triggers zero IPC calls.
	disabledTOML := `[idle]
    [idle.behavior.lock]
    enabled = false
    [idle.behavior.screen-off]
    enabled = false
`
	if err := os.WriteFile(settingsFile, []byte(disabledTOML), 0644); err != nil {
		t.Fatal(err)
	}
	called := false
	SyncNoctaliaIdleAtPath(cfg, settingsFile, func(key, val string) {
		called = true
	})
	if called {
		t.Fatal("expected zero IPC calls when Noctalia idle behaviors are already disabled")
	}

	// Disabled WScreenSavers mode leaves Noctalia untouched.
	cfg.Mode = "disabled"
	if err := os.WriteFile(settingsFile, []byte(sampleTOML), 0644); err != nil {
		t.Fatal(err)
	}
	SyncNoctaliaIdleAtPath(cfg, settingsFile, func(key, val string) {
		called = true
	})
	if called {
		t.Fatal("expected zero IPC calls when WScreenSavers mode is disabled")
	}
}
