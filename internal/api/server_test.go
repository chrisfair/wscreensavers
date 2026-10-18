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

	// 1. GET /api/savers
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

	// 2. PUT /api/savers/glmatrix/params
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

	// 3. GET /api/monitors
	mResp, err := http.Get(baseURL + "/api/monitors")
	if err != nil {
		t.Fatal(err)
	}
	mResp.Body.Close()
	if mResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK on /api/monitors, got %d", mResp.StatusCode)
	}
}
