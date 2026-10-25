package auth

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAuthHelpers(t *testing.T) {
	user := CurrentUsername()
	if user == "" {
		t.Errorf("expected non-empty username")
	}

	ok, err := VerifyPassword("")
	if ok || err == nil {
		t.Errorf("expected empty password to fail verification")
	}

	ok, err = VerifyPassword("__invalid_test_password_999__")
	if ok || err == nil {
		t.Errorf("expected invalid password to fail PAM verification")
	}

	if err := TriggerExternalLocker("unsupported_locker"); err == nil {
		t.Errorf("expected error for unsupported external locker")
	}

	tmpBin := t.TempDir()
	for _, bin := range []string{"hyprlock", "swaylock"} {
		p := filepath.Join(tmpBin, bin)
		if err := os.WriteFile(p, []byte("#!/bin/sh\nexit 0\n"), 0755); err != nil {
			t.Fatal(err)
		}
	}
	origPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", tmpBin+":"+origPath)
	defer func() { _ = os.Setenv("PATH", origPath) }()

	if err := TriggerExternalLocker("hyprlock"); err != nil {
		t.Errorf("expected hyprlock mock to start, got %v", err)
	}
	if err := TriggerExternalLocker("swaylock"); err != nil {
		t.Errorf("expected swaylock mock to start, got %v", err)
	}
}
