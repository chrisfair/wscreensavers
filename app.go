package main

import (
	"context"
	"wscreensavers/internal/api"
	"wscreensavers/internal/auth"
	"wscreensavers/internal/config"
	"wscreensavers/internal/display"
	"wscreensavers/internal/idle"
	"wscreensavers/internal/models"
)

// App struct bound to Wails frontend and backed by the unified API Server.
type App struct {
	ctx    context.Context
	cfgMgr *config.Manager
	srv    *api.Server
	stopCh chan struct{}
}

func NewApp(cfgMgr *config.Manager, srv *api.Server) *App {
	return &App{
		cfgMgr: cfgMgr,
		srv:    srv,
		stopCh: make(chan struct{}),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	go a.srv.StartIdleDaemonLoop(a.stopCh)
}

func (a *App) shutdown(ctx context.Context) {
	close(a.stopCh)
	a.srv.Shutdown()
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
	return a.srv.LaunchScreensaver(saverID, locked)
}

func (a *App) StopScreensaver() {
	a.srv.StopScreensaver()
}

func (a *App) VerifyPassword(password string) (bool, error) {
	return auth.VerifyPassword(password)
}

func (a *App) ToggleWallpaper(enabled bool, saverID string) error {
	return a.srv.SetWallpaperActive(enabled, saverID)
}
