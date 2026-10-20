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

func TestSupportManager_PricingTiers(t *testing.T) {
	dur1, label1, life1 := CooldownForAmount(1)
	if life1 || dur1 < 360*24*3600*1e9 || label1 != "$1 Pawn (1 Year)" {
		t.Fatalf("$1 tier mismatch: dur=%v, label=%s, life=%v", dur1, label1, life1)
	}

	dur5, label5, life5 := CooldownForAmount(5)
	if life5 || dur5 < 29*24*3600*1e9 || label5 != "$5 Knight (1 Month)" {
		t.Fatalf("$5 tier mismatch: dur=%v, label=%s, life=%v", dur5, label5, life5)
	}

	dur10, label10, life10 := CooldownForAmount(10)
	if !life10 || dur10 != 0 || label10 != "$10 Rook (God for Life)" {
		t.Fatalf("$10 tier mismatch: dur=%v, label=%s, life=%v", dur10, label10, life10)
	}

	dur35, _, life35 := CooldownForAmount(35)
	if !life35 || dur35 != 0 {
		t.Fatalf("$35 tier mismatch: dur=%v, life=%v", dur35, life35)
	}

	dur350, _, life350 := CooldownForAmount(350)
	if !life350 || dur350 != 0 {
		t.Fatalf("$350 tier mismatch: dur=%v, life=%v", dur350, life350)
	}
}
