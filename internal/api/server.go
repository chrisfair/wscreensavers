package api

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"math/rand"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
	"wscreensavers/internal/auth"
	"wscreensavers/internal/catalog"
	"wscreensavers/internal/config"
	"wscreensavers/internal/display"
	"wscreensavers/internal/idle"
	"wscreensavers/internal/layershell"
	"wscreensavers/internal/models"
	"wscreensavers/internal/xscreensaver"
)

type Server struct {
	mu          sync.RWMutex
	cfgMgr      *config.Manager
	idleMon     *idle.Monitor
	xssRunner   *xscreensaver.Runner
	xssStreamer *xscreensaver.Streamer
	layerCtrl   *layershell.ProcessController
	savers      []models.Screensaver
	frontendFS  fs.FS
	listenAddr  string
	baseURL     string
}

func NewServer(cfgMgr *config.Manager, frontendFS fs.FS) *Server {
	idleMon := idle.NewMonitor()
	srv := &Server{
		cfgMgr:      cfgMgr,
		idleMon:     idleMon,
		xssRunner:   xscreensaver.NewRunner(),
		xssStreamer: xscreensaver.NewStreamer(),
		frontendFS:  frontendFS,
	}
	srv.layerCtrl = layershell.NewProcessController(func() {
		idleMon.SetScreensaverActive(false, false)
	})
	srv.RefreshCatalog()
	return srv
}

func (s *Server) RefreshCatalog() []models.Screensaver {
	builtins := catalog.BuiltinScreensavers()
	nativeNames := make(map[string]bool)
	for _, b := range builtins {
		nativeNames[strings.ToLower(b.ID)] = true
		nativeNames[strings.ToLower(b.Name)] = true
	}
	external := xscreensaver.DiscoverSystemXScreenSavers(nativeNames)

	all := make([]models.Screensaver, 0, len(builtins)+len(external))
	all = append(all, builtins...)
	all = append(all, external...)

	s.mu.Lock()
	s.savers = all
	s.mu.Unlock()
	return all
}

func (s *Server) GetSavers() []models.Screensaver {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.savers
}

func (s *Server) FindSaver(id string) (models.Screensaver, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, sv := range s.savers {
		if sv.ID == id {
			return sv, true
		}
	}
	return models.Screensaver{}, false
}

func (s *Server) PickRandomSaver() string {
	cfg := s.cfgMgr.Get()
	if len(cfg.EnabledSavers) > 0 {
		return cfg.EnabledSavers[rand.Intn(len(cfg.EnabledSavers))]
	}
	savers := s.GetSavers()
	if len(savers) > 0 {
		return savers[rand.Intn(len(savers))].ID
	}
	return "glmatrix"
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/savers", s.handleSavers)
	mux.HandleFunc("/api/savers/", s.handleSaverAction)
	mux.HandleFunc("/api/xss-stream", s.handleXSSStream)
	mux.HandleFunc("/api/config", s.handleConfig)
	mux.HandleFunc("/api/monitors", s.handleMonitors)
	mux.HandleFunc("/api/status", s.handleStatus)
	mux.HandleFunc("/api/telemetry/blips", s.handleBlips)
	mux.HandleFunc("/api/telemetry/feed", s.handleFeed)
	mux.HandleFunc("/api/action/launch-saver", s.handleLaunchSaver)
	mux.HandleFunc("/api/action/lock", s.handleLock)
	mux.HandleFunc("/api/action/unlock", s.handleUnlock)
	mux.HandleFunc("/api/action/stop-saver", s.handleStopSaver)
	mux.HandleFunc("/api/action/toggle-wallpaper", s.handleToggleWallpaper)

	if s.frontendFS != nil {
		fileServer := http.FileServer(http.FS(s.frontendFS))
		mux.Handle("/", fileServer)
	}

	return corsMiddleware(mux)
}

func (s *Server) StartHTTP(preferredAddr string) (string, error) {
	handler := s.Handler()

	ln, err := net.Listen("tcp", preferredAddr)
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return "", err
		}
	}

	s.listenAddr = ln.Addr().String()
	s.baseURL = "http://" + s.listenAddr

	go func() {
		_ = http.Serve(ln, handler)
	}()

	// If wallpaper was enabled in saved config, launch it automatically
	cfg := s.cfgMgr.Get()
	if cfg.WallpaperEnabled {
		_ = s.SetWallpaperActive(true, cfg.WallpaperSaver)
	}

	return s.baseURL, nil
}

func (s *Server) BaseURL() string {
	return s.baseURL
}

func (s *Server) LaunchScreensaver(saverID string, locked bool) error {
	cfg := s.cfgMgr.Get()
	if saverID == "" {
		if cfg.Mode == "random" || cfg.Mode == "cycle" {
			saverID = s.PickRandomSaver()
		} else {
			saverID = cfg.SelectedSaver
		}
	}

	if locked && cfg.LockProvider != "native" && cfg.LockProvider != "" {
		return auth.TriggerExternalLocker(cfg.LockProvider)
	}

	s.idleMon.SetScreensaverActive(true, locked)
	return s.layerCtrl.StartSaverOverlay(s.baseURL, saverID, locked)
}

func (s *Server) StopScreensaver() {
	s.xssRunner.StopAll()
	s.layerCtrl.StopSaverOverlay()
	s.idleMon.SetScreensaverActive(false, false)
}

func (s *Server) SetWallpaperActive(enabled bool, saverID string) error {
	cfg := s.cfgMgr.Get()
	if saverID != "" {
		cfg.WallpaperSaver = saverID
	}
	if cfg.WallpaperSaver == "" {
		cfg.WallpaperSaver = "flurry"
	}
	cfg.WallpaperEnabled = enabled
	_ = s.cfgMgr.Update(cfg)

	if enabled {
		s.idleMon.SetWallpaperActive(true)
		return s.layerCtrl.StartWallpaper(s.baseURL, cfg.WallpaperSaver)
	}
	s.idleMon.SetWallpaperActive(false)
	s.layerCtrl.StopWallpaper()
	return nil
}

func (s *Server) StartIdleDaemonLoop(stopCh <-chan struct{}) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	var saverStartedAt time.Time

	for {
		select {
		case <-stopCh:
			s.layerCtrl.StopAll()
			s.xssRunner.StopAll()
			return
		case <-ticker.C:
			cfg := s.cfgMgr.Get()
			if cfg.Mode == "disabled" || cfg.IdleTimeoutMinutes <= 0 {
				continue
			}
			st := s.idleMon.Status(cfg.InhibitOnAudio, cfg.InhibitOnFullscreen)
			if st.Inhibited {
				s.idleMon.RecordActivity()
				continue
			}

			timeoutSec := cfg.IdleTimeoutMinutes * 60
			if !st.ScreensaverActive && st.IdleSeconds >= timeoutSec {
				saverStartedAt = time.Now()
				_ = s.LaunchScreensaver("", false)
			} else if st.ScreensaverActive && !st.Locked && cfg.LockEnabled {
				if int(time.Since(saverStartedAt).Seconds()) >= cfg.LockGraceSeconds {
					_ = s.LaunchScreensaver("", true)
				}
			}
		}
	}
}

func (s *Server) Shutdown() {
	s.xssRunner.StopAll()
	s.xssStreamer.StopAll()
	s.layerCtrl.StopAll()
}

// HTTP Handlers

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func (s *Server) handleSavers(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		writeJSON(w, http.StatusOK, s.RefreshCatalog())
		return
	}
	writeJSON(w, http.StatusOK, s.GetSavers())
}

func (s *Server) handleXSSStream(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("stop") == "1" {
		s.xssStreamer.StopClient(r.URL.Query().Get("client"))
		w.WriteHeader(http.StatusNoContent)
		return
	}
	saverID := r.URL.Query().Get("saver")
	if saverID == "" {
		http.Error(w, "missing saver query parameter", http.StatusBadRequest)
		return
	}
	saver, found := s.FindSaver(saverID)
	if !found {
		saver, found = s.FindSaver("xss_" + saverID)
	}
	if !found || saver.BinaryPath == "" {
		http.Error(w, "xscreensaver binary not found", http.StatusNotFound)
		return
	}
	cfg := s.cfgMgr.Get()
	params := cfg.SaverParams[saver.ID]
	s.xssStreamer.ServeMJPEG(w, r, saver, params, 30)
}

func (s *Server) handleSaverAction(w http.ResponseWriter, r *http.Request) {
	trimmed := strings.TrimPrefix(r.URL.Path, "/api/savers/")
	parts := strings.Split(trimmed, "/")
	if len(parts) < 2 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid saver path"})
		return
	}
	saverID := parts[0]
	action := parts[1]

	switch action {
	case "params":
		if r.Method != http.MethodPut && r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var params map[string]any
		if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		if err := s.cfgMgr.SetSaverParams(saverID, params); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, s.cfgMgr.Get())

	case "reset":
		saver, found := s.FindSaver(saverID)
		if !found {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "saver not found"})
			return
		}
		defaults := s.cfgMgr.ResetSaverParams(saverID, saver.Params)
		writeJSON(w, http.StatusOK, map[string]any{
			"saverId": saverID,
			"params":  defaults,
			"config":  s.cfgMgr.Get(),
		})

	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown action"})
	}
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, s.cfgMgr.Get())
	case http.MethodPut, http.MethodPost:
		var next models.AppConfig
		if err := json.NewDecoder(r.Body).Decode(&next); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		if err := s.cfgMgr.Update(next); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, s.cfgMgr.Get())
	default:
		writeJSON(w, http.StatusMethodNotAllowed, nil)
	}
}

func (s *Server) handleMonitors(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, display.DetectMonitors())
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	cfg := s.cfgMgr.Get()
	st := s.idleMon.Status(cfg.InhibitOnAudio, cfg.InhibitOnFullscreen)
	writeJSON(w, http.StatusOK, map[string]any{
		"daemon":   st,
		"username": auth.CurrentUsername(),
		"baseUrl":  s.baseURL,
	})
}

func (s *Server) handleBlips(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, idle.ScanSystemBlips())
}

func (s *Server) handleFeed(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, idle.SystemTelemetryFeed())
}

func (s *Server) handleLaunchSaver(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SaverID string `json:"saverId"`
		Locked  bool   `json:"locked"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if err := s.LaunchScreensaver(req.SaverID, req.Locked); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "saverId": req.SaverID})
}

func (s *Server) handleLock(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SaverID string `json:"saverId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if err := s.LaunchScreensaver(req.SaverID, true); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "locked": true})
}

func (s *Server) handleUnlock(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid request"})
		return
	}
	ok, err := auth.VerifyPassword(req.Password)
	if !ok || err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{
			"ok":    false,
			"error": fmt.Sprintf("Authentication failed for %s", auth.CurrentUsername()),
		})
		return
	}
	s.StopScreensaver()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleStopSaver(w http.ResponseWriter, r *http.Request) {
	s.StopScreensaver()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleToggleWallpaper(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Enabled bool   `json:"enabled"`
		SaverID string `json:"saverId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := s.SetWallpaperActive(req.Enabled, req.SaverID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, s.cfgMgr.Get())
}
