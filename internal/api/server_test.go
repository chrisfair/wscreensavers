package api

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
	"wscreensavers/internal/config"
	"wscreensavers/internal/models"
	"wscreensavers/internal/support"
)

func TestAPIServerEndpoints(t *testing.T) {
	tmpDir := t.TempDir()
	tmp := filepath.Join(tmpDir, "config.json")
	cfgMgr, err := config.NewManager(tmp)
	if err != nil {
		t.Fatal(err)
	}

	srv := NewServer(cfgMgr, nil)
	srv.supportMgr, _ = support.NewManager(filepath.Join(tmpDir, "support.json"))
	baseURL, err := srv.StartHTTP("127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to start API server: %v", err)
	}
	defer srv.Shutdown()

	if srv.BaseURL() != baseURL {
		t.Errorf("expected BaseURL %s, got %s", baseURL, srv.BaseURL())
	}

	if id := srv.PickRandomSaver(); id == "" {
		t.Errorf("expected non-empty random saver ID")
	}

	exclude := map[string]bool{"glmatrix": true, "sonar": true, "flurry": true}
	for i := 0; i < 20; i++ {
		uniqueID := srv.PickUniqueRandomSaver(exclude)
		if exclude[uniqueID] {
			t.Errorf("PickUniqueRandomSaver returned excluded saver: %s", uniqueID)
		}
	}

	// 1. GET & POST /api/savers
	resp, err := http.Get(baseURL + "/api/savers")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}
	var savers []models.Screensaver
	if err := json.NewDecoder(resp.Body).Decode(&savers); err != nil {
		t.Fatal(err)
	}
	if len(savers) < 22 {
		t.Errorf("expected at least 22 savers from /api/savers, got %d", len(savers))
	}

	postResp, err := http.Post(baseURL+"/api/savers", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	postResp.Body.Close()

	// 2. PUT & POST /api/savers/glmatrix/params and /reset
	req, _ := http.NewRequest(http.MethodPut, baseURL+"/api/savers/glmatrix/params", strings.NewReader(`{"speed":2.8,"density":75}`))
	req.Header.Set("Content-Type", "application/json")
	pResp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	pResp.Body.Close()
	if pResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK updating params, got %d", pResp.StatusCode)
	}

	rResp, err := http.Post(baseURL+"/api/savers/glmatrix/reset", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	rResp.Body.Close()
	if rResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK resetting params, got %d", rResp.StatusCode)
	}

	// 3. GET & PUT /api/config
	cResp, err := http.Get(baseURL + "/api/config")
	if err != nil {
		t.Fatal(err)
	}
	var cfg models.AppConfig
	_ = json.NewDecoder(cResp.Body).Decode(&cfg)
	cResp.Body.Close()

	cfg.IdleTimeoutMinutes = 25
	bodyBytes, _ := json.Marshal(cfg)
	putCfgReq, _ := http.NewRequest(http.MethodPut, baseURL+"/api/config", strings.NewReader(string(bodyBytes)))
	putCfgReq.Header.Set("Content-Type", "application/json")
	putCfgResp, err := http.DefaultClient.Do(putCfgReq)
	if err != nil {
		t.Fatal(err)
	}
	putCfgResp.Body.Close()
	if putCfgResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK on PUT /api/config, got %d", putCfgResp.StatusCode)
	}

	// 4. GET /api/monitors, /api/status, /api/telemetry/blips, /api/telemetry/feed
	for _, ep := range []string{"/api/monitors", "/api/status", "/api/telemetry/blips", "/api/telemetry/feed"} {
		res, err := http.Get(baseURL + ep)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != http.StatusOK {
			t.Errorf("expected 200 OK on %s, got %d", ep, res.StatusCode)
		}
	}

	// 5. POST /api/action/stop-saver & /api/action/unlock (empty password -> 401)
	stopRes, err := http.Post(baseURL+"/api/action/stop-saver", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	stopRes.Body.Close()

	unlockRes, err := http.Post(baseURL+"/api/action/unlock", "application/json", strings.NewReader(`{"password":""}`))
	if err != nil {
		t.Fatal(err)
	}
	unlockRes.Body.Close()
	if unlockRes.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 on empty password unlock, got %d", unlockRes.StatusCode)
	}

	// 6. Support endpoints: GET /api/support, POST /api/support/dismiss, POST /api/support/record
	suppRes, err := http.Get(baseURL + "/api/support")
	if err != nil {
		t.Fatal(err)
	}
	suppRes.Body.Close()
	if suppRes.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK on /api/support, got %d", suppRes.StatusCode)
	}

	disRes, err := http.Post(baseURL+"/api/support/dismiss", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	disRes.Body.Close()
	if disRes.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK on /api/support/dismiss, got %d", disRes.StatusCode)
	}

	recRes, err := http.Post(baseURL+"/api/support/record", "application/json", strings.NewReader(`{"tier":"$5 Support","reference":"test_rcpt"}`))
	if err != nil {
		t.Fatal(err)
	}
	recRes.Body.Close()
	if recRes.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK on /api/support/record, got %d", recRes.StatusCode)
	}
}

func TestLockSaverIDKeepsCurrentSaverOnlyInCycleMode(t *testing.T) {
	cfgMgr, err := config.NewManager(filepath.Join(t.TempDir(), "config.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := NewServer(cfgMgr, nil)
	srv.currentSaver = "flurry"

	cfg := cfgMgr.Get()
	cfg.Mode = "cycle"
	if id := srv.lockSaverID(cfg); id != "flurry" {
		t.Errorf("cycle mode: expected current saver flurry, got %q", id)
	}
	cfg.Mode = "random"
	if id := srv.lockSaverID(cfg); id != "" {
		t.Errorf("random mode: expected empty ID so the picker decides, got %q", id)
	}
}
