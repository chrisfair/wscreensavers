package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"wscreensavers/internal/catalog"
	"wscreensavers/internal/models"
)

type Manager struct {
	mu         sync.RWMutex
	configPath string
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
		WallpaperEnabled:      false,
		WallpaperSaver:        "flurry",
		WallpaperPerMonitor:   make(map[string]string),
		WallpaperFPSCap:       30,
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
	if loaded.WallpaperPerMonitor == nil {
		loaded.WallpaperPerMonitor = make(map[string]string)
	}
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
	return os.WriteFile(m.configPath, data, 0644)
}

func (m *Manager) Get() models.AppConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cfg
}

func (m *Manager) Update(next models.AppConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if next.PerMonitorSaver == nil {
		next.PerMonitorSaver = make(map[string]string)
	}
	if next.WallpaperPerMonitor == nil {
		next.WallpaperPerMonitor = make(map[string]string)
	}
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
