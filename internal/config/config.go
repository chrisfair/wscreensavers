package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
	"wscreensavers/internal/catalog"
	"wscreensavers/internal/models"
)

type Manager struct {
	mu         sync.RWMutex
	configPath string
	lastMod    time.Time
	cfg        models.AppConfig
}

func DefaultConfig() models.AppConfig {
	savers := catalog.BuiltinScreensavers()
	presetParams := make(map[string]map[string]any)
	enabled := make([]string, 0, len(savers))
	for _, s := range savers {
		enabled = append(enabled, s.ID)
		pMap := make(map[string]any)
		for _, p := range s.Params {
			pMap[p.ID] = p.Default
		}
		presetParams[s.ID] = pMap
	}

	return models.AppConfig{
		Mode:                  "random",
		SelectedSaver:         "glmatrix",
		IdleTimeoutMinutes:    10,
		CycleTimeoutMinutes:   5,
		LockEnabled:           true,
		LockGraceSeconds:      5,
		LockProvider:          "native",
		ShowClockOnSaver:      true,
		InhibitOnAudio:        true,
		InhibitOnFullscreen:   true,
		MultiMonitorMode:      "independent",
		PerMonitorSaver:       make(map[string]string),
		WallpaperMode:         "per-monitor",
		WallpaperEnabled:      false,
		WallpaperSaver:        "flurry",
		WallpaperPerMonitor:   make(map[string]string),
		WallpaperFPSCap:       24,
		EnabledSavers:         enabled,
		SaverParams:           presetParams,
		DPMSOffMinutes:        30,
		PreferNativeOverX11:   true,
		XSSMaxStreamDim:       1920,
	}
}

func NewManager(customPath string) (*Manager, error) {
	if customPath == "" {
		cfgDir, err := os.UserConfigDir()
		if err != nil {
			cfgDir = filepath.Join(os.Getenv("HOME"), ".config")
		}
		customPath = filepath.Join(cfgDir, "wscreensavers", "config.json")
	}

	m := &Manager{
		configPath: customPath,
		cfg:        DefaultConfig(),
	}
	_ = m.Load()
	return m, nil
}

func (m *Manager) Load() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.loadLocked()
}

func (m *Manager) loadLocked() error {
	fi, statErr := os.Stat(m.configPath)
	if statErr == nil {
		m.lastMod = fi.ModTime()
	}

	data, err := os.ReadFile(m.configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return m.saveLocked()
		}
		return err
	}

	loaded := DefaultConfig()
	if err := json.Unmarshal(data, &loaded); err != nil {
		return err
	}
	if loaded.PerMonitorSaver == nil {
		loaded.PerMonitorSaver = make(map[string]string)
	}
	if loaded.WallpaperMode == "" {
		loaded.WallpaperMode = "per-monitor"
	}
	if loaded.WallpaperPerMonitor == nil {
		loaded.WallpaperPerMonitor = make(map[string]string)
	}
	if loaded.PreferNativeOverX11 {
		normalizeNativeSaverIDs(&loaded)
	}
	loaded.WallpaperPerMonitor = SanitizeWallpaperPerMonitor(loaded.WallpaperPerMonitor)
	if loaded.SaverParams == nil {
		loaded.SaverParams = make(map[string]map[string]any)
	}
	// Ensure defaults exist for all builtin savers
	def := DefaultConfig()
	for saverID, defParams := range def.SaverParams {
		if _, ok := loaded.SaverParams[saverID]; !ok {
			loaded.SaverParams[saverID] = defParams
		} else {
			for k, v := range defParams {
				if _, exists := loaded.SaverParams[saverID][k]; !exists {
					loaded.SaverParams[saverID][k] = v
				}
			}
		}
	}

	m.cfg = loaded
	return nil
}

func (m *Manager) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(m.configPath), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(m.cfg, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(m.configPath, data, 0644); err != nil {
		return err
	}
	if fi, err := os.Stat(m.configPath); err == nil {
		m.lastMod = fi.ModTime()
	}
	return nil
}

func (m *Manager) Get() models.AppConfig {
	if fi, err := os.Stat(m.configPath); err == nil {
		m.mu.RLock()
		modChanged := fi.ModTime().After(m.lastMod)
		m.mu.RUnlock()
		if modChanged {
			m.mu.Lock()
			if fi.ModTime().After(m.lastMod) {
				_ = m.loadLocked()
			}
			m.mu.Unlock()
		}
	}

	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cfg
}

func normalizeNativeSaverIDs(cfg *models.AppConfig) {
	builtins := make(map[string]string)
	for _, s := range catalog.BuiltinScreensavers() {
		builtins[strings.ToLower(s.ID)] = s.ID
	}
	norm := func(id string) string {
		if strings.HasPrefix(strings.ToLower(id), "xss_") {
			base := strings.ToLower(strings.TrimPrefix(id, "xss_"))
			if nativeID, ok := builtins[base]; ok {
				return nativeID
			}
		}
		return id
	}
	cfg.SelectedSaver = norm(cfg.SelectedSaver)
	cfg.WallpaperSaver = norm(cfg.WallpaperSaver)
	for k, v := range cfg.PerMonitorSaver {
		cfg.PerMonitorSaver[k] = norm(v)
	}
	for k, v := range cfg.WallpaperPerMonitor {
		cfg.WallpaperPerMonitor[k] = norm(v)
	}
}

// SanitizeWallpaperPerMonitor ensures that no two monitor outputs share the same saver ID.
// If a duplicate is encountered, earlier assignments keep their value and the duplicate is cleared,
// guaranteeing that each monitor is assigned a strictly unique screensaver.
func SanitizeWallpaperPerMonitor(perMon map[string]string) map[string]string {
	if perMon == nil {
		return make(map[string]string)
	}
	keys := make([]string, 0, len(perMon))
	for k := range perMon {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	cleaned := make(map[string]string)
	seenSavers := make(map[string]string) // saverID -> monitorName
	for _, mon := range keys {
		saver := perMon[mon]
		if saver == "" || saver == "random" {
			cleaned[mon] = saver
			continue
		}
		if existingMon, exists := seenSavers[saver]; exists && existingMon != mon {
			// Duplicate saver assigned to another monitor; clear the duplicate on mon
			continue
		}
		cleaned[mon] = saver
		seenSavers[saver] = mon
	}
	return cleaned
}

func (m *Manager) Update(next models.AppConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if next.PerMonitorSaver == nil {
		next.PerMonitorSaver = make(map[string]string)
	}
	if next.WallpaperMode == "" {
		next.WallpaperMode = "single"
	}
	if next.WallpaperPerMonitor == nil {
		next.WallpaperPerMonitor = make(map[string]string)
	}
	if next.PreferNativeOverX11 {
		normalizeNativeSaverIDs(&next)
	}
	next.WallpaperPerMonitor = SanitizeWallpaperPerMonitor(next.WallpaperPerMonitor)
	if next.SaverParams == nil {
		next.SaverParams = m.cfg.SaverParams
	}
	m.cfg = next
	return m.saveLocked()
}

func (m *Manager) SetSaverParams(saverID string, params map[string]any) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cfg.SaverParams == nil {
		m.cfg.SaverParams = make(map[string]map[string]any)
	}
	m.cfg.SaverParams[saverID] = params
	return m.saveLocked()
}

func (m *Manager) ResetSaverParams(saverID string, schema []models.SaverParam) map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	defaults := make(map[string]any)
	for _, p := range schema {
		defaults[p.ID] = p.Default
	}
	if m.cfg.SaverParams == nil {
		m.cfg.SaverParams = make(map[string]map[string]any)
	}
	m.cfg.SaverParams[saverID] = defaults
	_ = m.saveLocked()
	return defaults
}

func (m *Manager) Path() string {
	return m.configPath
}

// ShufflePath is where the persistent random-rotation state lives, beside the config.
func (m *Manager) ShufflePath() string {
	return filepath.Join(filepath.Dir(m.configPath), "shuffle.json")
}
