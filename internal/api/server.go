package api

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"math/rand"
	"net"
	"net/http"
	"os/exec"
	"strconv"
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
	"wscreensavers/internal/shuffle"
	"wscreensavers/internal/support"
	"wscreensavers/internal/xscreensaver"
)

type Server struct {
	mu          sync.RWMutex
	cfgMgr      *config.Manager
	supportMgr  *support.Manager
	idleMon     *idle.Monitor
	xssRunner   *xscreensaver.Runner
	xssStreamer *xscreensaver.Streamer
	layerCtrl   *layershell.ProcessController
	savers      []models.Screensaver
	frontendFS  fs.FS
	listenAddr  string
	baseURL     string

	currentSaver string // guarded by mu; saver most recently handed to the overlay
}

func NewServer(cfgMgr *config.Manager, frontendFS fs.FS) *Server {
	idleMon := idle.NewMonitor()
	suppMgr, _ := support.NewManager("")
	srv := &Server{
		cfgMgr:      cfgMgr,
		supportMgr:  suppMgr,
		idleMon:     idleMon,
		xssRunner:   xscreensaver.NewRunner(),
		xssStreamer: xscreensaver.NewStreamer(),
		frontendFS:  frontendFS,
	}
	srv.layerCtrl = layershell.NewProcessController(func() {
		idleMon.SetScreensaverActive(false, false)
		idleMon.RecordActivity()
		srv.xssRunner.StopAll()
		// Resume wallpaper if enabled in config
		cfg := srv.cfgMgr.Get()
		if cfg.WallpaperEnabled {
			if cfg.WallpaperMode == "per-monitor" {
				_ = srv.layerCtrl.StartWallpaper(srv.baseURL, "")
			} else {
				wpSaver := cfg.WallpaperSaver
				if wpSaver == "random" || wpSaver == "" {
					wpSaver = srv.PickRandomSaver()
				}
				_ = srv.layerCtrl.StartWallpaper(srv.baseURL, wpSaver)
			}
		}
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

// PickRandomSaver draws from the enabled pool without repeats until every
// saver has been shown once; the round state persists across processes.
func (s *Server) PickRandomSaver() string {
	cfg := s.cfgMgr.Get()
	pool := cfg.EnabledSavers
	if len(pool) == 0 {
		for _, sv := range s.GetSavers() {
			pool = append(pool, sv.ID)
		}
	}
	if len(pool) == 0 {
		return "glmatrix"
	}
	return shuffle.Next(s.cfgMgr.ShufflePath(), pool)
}

// PickUniqueRandomSaver draws a screensaver not in the exclude map, ensuring no
// duplicate live wallpapers across multi-head setups.
func (s *Server) PickUniqueRandomSaver(exclude map[string]bool) string {
	cfg := s.cfgMgr.Get()
	pool := cfg.EnabledSavers
	if len(pool) == 0 {
		for _, sv := range s.GetSavers() {
			pool = append(pool, sv.ID)
		}
	}
	var available []string
	for _, id := range pool {
		if !exclude[id] {
			available = append(available, id)
		}
	}
	if len(available) == 0 {
		return s.PickRandomSaver()
	}
	return available[rand.Intn(len(available))]
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
	mux.HandleFunc("/api/action/dpms-off", s.handleDPMSOff)
	mux.HandleFunc("/api/action/dpms-on", s.handleDPMSOn)
	mux.HandleFunc("/api/support", s.handleSupportStatus)
	mux.HandleFunc("/api/support/dismiss", s.handleSupportDismiss)
	mux.HandleFunc("/api/support/record", s.handleSupportRecord)
	mux.HandleFunc("/api/support/open", s.handleSupportOpen)

	if s.frontendFS != nil {
		fileServer := http.FileServer(http.FS(s.frontendFS))
		mux.Handle("/", fileServer)
	}

	return corsMiddleware(mux)
}

// StartHTTP serves the API and, when the saved config asks for it, brings the
// live wallpaper up. Only the long-lived daemon / primary process should use it.
func (s *Server) StartHTTP(preferredAddr string) (string, error) {
	baseURL, err := s.StartEmbeddedHTTP(preferredAddr)
	if err != nil {
		return "", err
	}

	// Only launch wallpaper automatically if this server is the primary daemon on preferredAddr.
	// If preferredAddr was in use by another instance, StartEmbeddedHTTP bound to a fallback port
	// (s.listenAddr != preferredAddr), meaning another wscreensavers instance is already running.
	if s.listenAddr == preferredAddr {
		cfg := s.cfgMgr.Get()
		if cfg.WallpaperEnabled {
			go func() {
				// Allow compositor socket and layer-shell protocol to be fully initialized on boot
				time.Sleep(1 * time.Second)
				wpSaver := cfg.WallpaperSaver
				if cfg.WallpaperMode == "per-monitor" {
					wpSaver = "per-monitor"
				} else if wpSaver == "random" || wpSaver == "" {
					wpSaver = s.PickRandomSaver()
				}
				_ = s.SetWallpaperActive(true, wpSaver)
			}()
		}
	}

	return baseURL, nil
}

// StartEmbeddedHTTP serves the API without touching the wallpaper. The --saver,
// --lock and --wallpaper child processes use it: they must never spawn their own
// wallpaper helper, which would duplicate hacks and virtual displays.
func (s *Server) StartEmbeddedHTTP(preferredAddr string) (string, error) {
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

	return s.baseURL, nil
}

func (s *Server) BaseURL() string {
	return s.baseURL
}

func (s *Server) LaunchScreensaver(saverID string, locked bool) error {
	cfg := s.cfgMgr.Get()
	if saverID == "" || saverID == "random" {
		if cfg.Mode == "random" || cfg.Mode == "cycle" || saverID == "random" {
			saverID = s.PickRandomSaver()
		} else {
			saverID = cfg.SelectedSaver
		}
	}

	if locked && cfg.LockProvider != "native" && cfg.LockProvider != "" {
		return auth.TriggerExternalLocker(cfg.LockProvider)
	}

	s.mu.Lock()
	s.currentSaver = saverID
	s.mu.Unlock()

	s.idleMon.SetScreensaverActive(true, locked)

	// Stop live wallpaper so it doesn't render or stack under the fullscreen screensaver
	s.layerCtrl.StopWallpaper()

	return s.layerCtrl.StartSaverOverlay(s.baseURL, saverID, locked)
}

func (s *Server) StopScreensaver() {
	_ = s.SetDPMS(true)
	s.xssRunner.StopAll()
	s.layerCtrl.StopSaverOverlay()
	s.idleMon.SetScreensaverActive(false, false)
	s.idleMon.RecordActivity()

	// Resume wallpaper if enabled in config
	cfg := s.cfgMgr.Get()
	if cfg.WallpaperEnabled {
		if cfg.WallpaperMode == "per-monitor" {
			_ = s.layerCtrl.StartWallpaper(s.baseURL, "")
		} else {
			wpSaver := cfg.WallpaperSaver
			if wpSaver == "random" || wpSaver == "" {
				wpSaver = s.PickRandomSaver()
			}
			_ = s.layerCtrl.StartWallpaper(s.baseURL, wpSaver)
		}
	}
}

func (s *Server) SetWallpaperActive(enabled bool, saverID string) error {
	cfg := s.cfgMgr.Get()
	if saverID != "" && saverID != "per-monitor" {
		cfg.WallpaperSaver = saverID
	}
	if cfg.WallpaperSaver == "" {
		cfg.WallpaperSaver = "flurry"
	}
	cfg.WallpaperEnabled = enabled
	_ = s.cfgMgr.Update(cfg)

	if enabled {
		s.idleMon.SetWallpaperActive(true)
		if cfg.WallpaperMode == "per-monitor" {
			return s.layerCtrl.StartWallpaper(s.baseURL, "")
		}
		actualSaver := cfg.WallpaperSaver
		if actualSaver == "random" {
			actualSaver = s.PickRandomSaver()
		}
		return s.layerCtrl.StartWallpaper(s.baseURL, actualSaver)
	}
	s.idleMon.SetWallpaperActive(false)
	s.layerCtrl.StopWallpaper()
	return nil
}

func (s *Server) StartIdleDaemonLoop(stopCh <-chan struct{}) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	var saverStartedAt, lastSwitchAt, lastWallpaperSwitchAt time.Time

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
				lastSwitchAt = saverStartedAt
				_ = s.LaunchScreensaver("", false)
			} else if st.ScreensaverActive && !st.Locked && cfg.LockEnabled &&
				int(time.Since(saverStartedAt).Seconds()) >= cfg.LockGraceSeconds {
				// In cycle mode keep the saver that is on screen rather than jumping to the next one.
				_ = s.LaunchScreensaver(s.lockSaverID(cfg), true)
			} else if st.ScreensaverActive && !st.Locked && cfg.Mode == "cycle" &&
				cfg.CycleTimeoutMinutes > 0 &&
				time.Since(lastSwitchAt) >= time.Duration(cfg.CycleTimeoutMinutes)*time.Minute {
				// Cycling never restarts a locked overlay, so the lock surface is never torn down.
				lastSwitchAt = time.Now()
				_ = s.LaunchScreensaver("", false)
			}

			// Wallpaper rotation if set to random/per-monitor and cycle timeout configured
			if cfg.WallpaperEnabled && !st.ScreensaverActive && cfg.CycleTimeoutMinutes > 0 {
				if cfg.WallpaperMode == "per-monitor" || cfg.WallpaperSaver == "random" {
					if lastWallpaperSwitchAt.IsZero() {
						lastWallpaperSwitchAt = time.Now()
					} else if time.Since(lastWallpaperSwitchAt) >= time.Duration(cfg.CycleTimeoutMinutes)*time.Minute {
						lastWallpaperSwitchAt = time.Now()
						if cfg.WallpaperMode == "per-monitor" {
							_ = s.layerCtrl.StartWallpaper(s.baseURL, "")
						} else {
							_ = s.layerCtrl.StartWallpaper(s.baseURL, s.PickRandomSaver())
						}
					}
				}
			}

			// Screen sleep / DPMS off if screensaver active and dpmsOffMinutes elapsed
			if cfg.DPMSOffMinutes > 0 && st.ScreensaverActive {
				dpmsSec := (cfg.IdleTimeoutMinutes + cfg.DPMSOffMinutes) * 60
				if st.IdleSeconds >= dpmsSec {
					_ = s.SetDPMS(false)
				}
			}
		}
	}
}

// lockSaverID returns the saver the lock overlay should show: the current one in
// cycle mode, otherwise "" so LaunchScreensaver picks per the usual mode rules.
func (s *Server) lockSaverID(cfg models.AppConfig) string {
	if cfg.Mode != "cycle" {
		return ""
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentSaver
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
		s.xssStreamer.StopClient(r.URL.Query().Get("monitor"), r.URL.Query().Get("client"))
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
	q := r.URL.Query()
	width, _ := strconv.Atoi(q.Get("w"))
	height, _ := strconv.Atoi(q.Get("h"))
	fps, _ := strconv.Atoi(q.Get("fps"))
	if fps <= 0 {
		fps = 30
	}
	s.xssStreamer.ServeMJPEG(w, r, saver, params, fps, q.Get("monitor"), width, height, cfg.XSSMaxStreamDim)
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
		"daemon":          st,
		"username":        auth.CurrentUsername(),
		"baseUrl":         s.baseURL,
		"otherWallpapers": display.OtherWallpaperPrograms(),
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

// SetDPMS manages Wayland/display power management (Hyprland, Sway, wlr-randr).
func (s *Server) SetDPMS(on bool) error {
	arg := "on"
	if !on {
		arg = "off"
	}
	if _, err := exec.LookPath("hyprctl"); err == nil {
		_ = exec.Command("hyprctl", "dispatch", "dpms", arg).Run()
	}
	if _, err := exec.LookPath("swaymsg"); err == nil {
		_ = exec.Command("swaymsg", "output", "*", "dpms", arg).Run()
	}
	if _, err := exec.LookPath("wlr-randr"); err == nil {
		wlrArg := "--on"
		if !on {
			wlrArg = "--off"
		}
		_ = exec.Command("wlr-randr", wlrArg).Run()
	}
	return nil
}

func (s *Server) handleDPMSOff(w http.ResponseWriter, r *http.Request) {
	_ = s.SetDPMS(false)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "dpms": "off"})
}

func (s *Server) handleDPMSOn(w http.ResponseWriter, r *http.Request) {
	_ = s.SetDPMS(true)
	s.idleMon.RecordActivity()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "dpms": "on"})
}

func (s *Server) ensureSupportMgr() *support.Manager {
	if s.supportMgr == nil {
		s.supportMgr, _ = support.NewManager("")
	}
	return s.supportMgr
}

func (s *Server) GetSupportStatus() support.SupportStatus {
	return s.ensureSupportMgr().GetStatus(nil, nil)
}

func (s *Server) RecordUserSupport(tier string, reference string) (support.SupportStatus, error) {
	return s.ensureSupportMgr().RecordSupport(tier, reference)
}

func (s *Server) DismissSupportNag() (support.SupportStatus, error) {
	return s.ensureSupportMgr().DismissNag()
}

func (s *Server) OpenSupportLink(amountUSD int, openSystemBrowser bool) (string, support.SupportStatus) {
	st := s.GetSupportStatus()
	if amountUSD < support.DefaultMinSupportUSD {
		amountUSD = support.DefaultMinSupportUSD
	}
	baseURL := support.StripeURLForAmount(amountUSD, st.StripeURL)
	targetURL := support.BuildCheckoutURL(baseURL, fmt.Sprintf("wscreensavers_%dusd", amountUSD))
	updated, _ := s.RecordUserSupport(fmt.Sprintf("$%d Support", amountUSD), "stripe_checkout")
	if openSystemBrowser {
		_ = exec.Command("xdg-open", targetURL).Start()
	}
	return targetURL, updated
}

func (s *Server) handleSupportStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.GetSupportStatus())
}

func (s *Server) handleSupportDismiss(w http.ResponseWriter, r *http.Request) {
	st, err := s.DismissSupportNag()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (s *Server) handleSupportRecord(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Tier      string `json:"tier"`
		Reference string `json:"reference"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	st, err := s.RecordUserSupport(req.Tier, req.Reference)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (s *Server) handleSupportOpen(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AmountUSD int `json:"amountUsd"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	targetURL, st := s.OpenSupportLink(req.AmountUSD, true)
	writeJSON(w, http.StatusOK, map[string]any{
		"url":    targetURL,
		"status": st,
	})
}
