package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"wscreensavers/internal/api"
	"wscreensavers/internal/auth"
	"wscreensavers/internal/config"
	"wscreensavers/internal/display"
	"wscreensavers/internal/idle"
	"wscreensavers/internal/models"
	"wscreensavers/internal/support"
)

// App struct bound as a Wails v3 service and backed by the unified API Server.
type App struct {
	ctx      context.Context
	wailsApp *application.App
	cfgMgr   *config.Manager
	srv      *api.Server
	stopCh   chan struct{}
}

func NewApp(cfgMgr *config.Manager, srv *api.Server) *App {
	return &App{
		cfgMgr: cfgMgr,
		srv:    srv,
		stopCh: make(chan struct{}),
	}
}

func (a *App) SetApplication(wailsApp *application.App) {
	a.wailsApp = wailsApp
}

func (a *App) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	a.ctx = ctx
	// Only run idle daemon loop if this server is the primary daemon on port 8642.
	// If a background daemon is already running, it handles idle detection and DPMS.
	if a.srv.BaseURL() == "http://127.0.0.1:8642" {
		go a.srv.StartIdleDaemonLoop(a.stopCh)
	}
	return nil
}

func (a *App) ServiceShutdown() error {
	select {
	case <-a.stopCh:
	default:
		close(a.stopCh)
	}
	a.srv.Shutdown()
	return nil
}

func (a *App) GetServerBaseURL() string {
	return a.srv.BaseURL()
}

func (a *App) GetScreensavers() []models.Screensaver {
	return a.srv.GetSavers()
}

func (a *App) GetConfig() models.AppConfig {
	return a.cfgMgr.Get()
}

func (a *App) SaveConfig(next models.AppConfig) (models.AppConfig, error) {
	err := a.cfgMgr.Update(next)
	return a.cfgMgr.Get(), err
}

func (a *App) GetMonitors() []models.MonitorOutput {
	return display.DetectMonitors()
}

func (a *App) GetSystemBlips() []models.SystemBlip {
	return idle.ScanSystemBlips()
}

func (a *App) GetTelemetryFeed() []string {
	return idle.SystemTelemetryFeed()
}

func (a *App) LaunchScreensaver(saverID string, locked bool) error {
	if a.srv.BaseURL() != "http://127.0.0.1:8642" {
		client := &http.Client{Timeout: 800 * time.Millisecond}
		payload, _ := json.Marshal(map[string]any{"saverId": saverID, "locked": locked})
		if resp, err := client.Post("http://127.0.0.1:8642/api/action/launch-saver", "application/json", bytes.NewReader(payload)); err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
	}
	return a.srv.LaunchScreensaver(saverID, locked)
}

func (a *App) StopScreensaver() {
	if a.srv.BaseURL() != "http://127.0.0.1:8642" {
		client := &http.Client{Timeout: 800 * time.Millisecond}
		if resp, err := client.Post("http://127.0.0.1:8642/api/action/stop-saver", "application/json", nil); err == nil {
			resp.Body.Close()
		}
	}
	a.srv.StopScreensaver()
}

func (a *App) VerifyPassword(password string) (bool, error) {
	return auth.VerifyPassword(password)
}

func (a *App) ToggleWallpaper(enabled bool, saverID string) error {
	if a.srv.BaseURL() != "http://127.0.0.1:8642" {
		client := &http.Client{Timeout: 800 * time.Millisecond}
		payload, _ := json.Marshal(map[string]any{"enabled": enabled, "saverId": saverID})
		if resp, err := client.Post("http://127.0.0.1:8642/api/action/toggle-wallpaper", "application/json", bytes.NewReader(payload)); err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				cfg := a.cfgMgr.Get()
				cfg.WallpaperEnabled = enabled
				if saverID != "" {
					cfg.WallpaperSaver = saverID
				}
				_ = a.cfgMgr.Update(cfg)
				return nil
			}
		}
	}
	return a.srv.SetWallpaperActive(enabled, saverID)
}

func (a *App) GetSupportStatus() support.SupportStatus {
	return a.srv.GetSupportStatus()
}

func (a *App) RecordUserSupport(tier string, reference string) (support.SupportStatus, error) {
	return a.srv.RecordUserSupport(tier, reference)
}

func (a *App) DismissSupportNag() (support.SupportStatus, error) {
	return a.srv.DismissSupportNag()
}

func (a *App) OpenSupportLink(amountUSD int) string {
	targetURL, _ := a.srv.OpenSupportLink(amountUSD, a.wailsApp == nil)
	if a.wailsApp != nil && a.wailsApp.Browser != nil {
		_ = a.wailsApp.Browser.OpenURL(targetURL)
	}
	return targetURL
}

