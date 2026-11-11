package config

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"wscreensavers/internal/models"
)

var noctaliaLookPath = exec.LookPath

// SyncNoctaliaIdle prevents Noctalia's built-in [idle] manager (which defaults to
// 540s lock and 600s hardware screen-off in ~/.config/noctalia/settings.toml) from
// overriding WScreenSavers's configured idleTimeoutMinutes, dpmsOffMinutes, and lockEnabled.
func SyncNoctaliaIdle(cfg models.AppConfig) {
	settingsPath := defaultNoctaliaSettingsPath()
	if settingsPath == "" {
		return
	}
	SyncNoctaliaIdleAtPath(cfg, settingsPath, func(key, val string) {
		if bin, err := noctaliaLookPath("noctalia"); err == nil && bin != "" {
			_ = exec.Command(bin, "msg", "config-set", key, val).Run()
		}
	})
}

func defaultNoctaliaSettingsPath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		home := os.Getenv("HOME")
		if home == "" {
			return ""
		}
		cfgDir = filepath.Join(home, ".config")
	}
	return filepath.Join(cfgDir, "noctalia", "settings.toml")
}

// SyncNoctaliaIdleAtPath inspects a Noctalia settings.toml file and invokes setFn
// only when Noctalia's [idle] section has conflicting lock/screen-off behaviors enabled
// or stale timeout values while WScreenSavers is active.
func SyncNoctaliaIdleAtPath(cfg models.AppConfig, settingsPath string, setFn func(key, val string)) {
	if cfg.Mode == "disabled" || settingsPath == "" || setFn == nil {
		return
	}
	raw, err := os.ReadFile(settingsPath)
	if err != nil {
		return
	}
	text := string(raw)
	if !strings.Contains(text, "[idle") {
		return
	}

	idleSec := cfg.IdleTimeoutMinutes * 60
	if idleSec <= 0 {
		idleSec = 600
	}
	dpmsSec := idleSec + cfg.DPMSOffMinutes*60
	if cfg.DPMSOffMinutes <= 0 {
		dpmsSec = idleSec
	}

	// Only invoke Noctalia IPC if [idle.behavior.lock] or [idle.behavior.screen-off]
	// is currently enabled in settings.toml, avoiding unnecessary IPC writes on every save.
	if noctaliaIdleSectionHasEnabledBehavior(text) {
		setFn("idle.behavior.lock.enabled", "false")
		setFn("idle.behavior.screen-off.enabled", "false")
		setFn("idle.behavior.lock.command", `"wscreensavers --lock"`)
		setFn("idle.behavior.lock.timeout", fmt.Sprintf("%.1f", float64(idleSec)))
		setFn("idle.behavior.screen-off.timeout", fmt.Sprintf("%.1f", float64(dpmsSec)))
	}
}

func noctaliaIdleSectionHasEnabledBehavior(tomlText string) bool {
	inIdleSub := false
	for _, line := range strings.Split(tomlText, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]") {
			header := strings.TrimSpace(trimmed[1 : len(trimmed)-1])
			inIdleSub = strings.HasPrefix(header, "idle.behavior.")
			continue
		}
		if inIdleSub {
			noSpace := strings.ReplaceAll(trimmed, " ", "")
			if strings.HasPrefix(noSpace, "enabled=true") {
				return true
			}
		}
	}
	return false
}
