package api

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
	"wscreensavers/internal/config"
	"wscreensavers/internal/models"
)

func TestAPIServerEndpoints(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "config.json")
	cfgMgr, err := config.NewManager(tmp)
	if err != nil {
		t.Fatal(err)
	}

	srv := NewServer(cfgMgr, nil)
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
}
