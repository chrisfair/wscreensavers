package support

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSupportManager_DefaultAndDismiss(t *testing.T) {
	tmpDir := t.TempDir()
	cfgPath := filepath.Join(tmpDir, "support.json")

	mgr, err := NewManager(cfgPath)
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}

	st := mgr.GetStatus([]string{"RandomUser"}, []string{"AnotherUser"})
	if st.Supported || st.IsAuthor || !st.ShouldShowNag {
		t.Fatalf("unexpected initial status: %+v", st)
	}
	if st.MinAmountUSD != DefaultMinSupportUSD {
		t.Fatalf("expected min amount %d, got %d", DefaultMinSupportUSD, st.MinAmountUSD)
	}

	stDismiss, err := mgr.DismissNag()
	if err != nil {
		t.Fatalf("DismissNag failed: %v", err)
	}
	if stDismiss.DismissCount != 1 || stDismiss.ShouldShowNag {
		t.Fatalf("expected dismissed state, got %+v", stDismiss)
	}

	mgr2, err := NewManager(cfgPath)
	if err != nil {
		t.Fatalf("NewManager reload failed: %v", err)
	}
	st2 := mgr2.GetStatus(nil, nil)
	if st2.DismissCount != 1 || st2.ShouldShowNag {
		t.Fatalf("expected persisted dismissed state, got %+v", st2)
	}

	// Simulate 25 hours having passed
	mgr2.config.LastDismissedAt -= (25 * 3600 * 1000)
	if err := mgr2.save(); err != nil {
		t.Fatalf("save failed: %v", err)
	}
	stAfterDay := mgr2.GetStatus(nil, nil)
	if !stAfterDay.ShouldShowNag {
		t.Fatalf("expected prompt to appear again after 24 hours")
	}
}

func TestSupportManager_RecordSupportAndAuthorExemption(t *testing.T) {
	tmpDir := t.TempDir()
	cfgPath := filepath.Join(tmpDir, "support.json")

	mgr, err := NewManager(cfgPath)
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}

	st, err := mgr.RecordSupport("$10 Supporter", "stripe_rcpt_123")
	if err != nil {
		t.Fatalf("RecordSupport failed: %v", err)
	}
	if !st.Supported || st.ShouldShowNag || st.SupporterTier != "$10 Supporter" {
		t.Fatalf("unexpected recorded support status: %+v", st)
	}

	// Author handle verification
	stAuthor, err := mgr.RecordSupport("", "QuenyenHighElf")
	if err != nil {
		t.Fatalf("RecordSupport author failed: %v", err)
	}
	if !stAuthor.IsAuthor || !stAuthor.IsLifetime || stAuthor.ShouldShowNag {
		t.Fatalf("expected author lifetime exemption, got %+v", stAuthor)
	}

	// Corrupt JSON handled gracefully
	corruptPath := filepath.Join(tmpDir, "corrupt.json")
	_ = os.WriteFile(corruptPath, []byte("{invalid"), 0o644)
	if _, err := NewManager(corruptPath); err != nil {
		t.Fatalf("expected corrupt json to be handled gracefully: %v", err)
	}
}
