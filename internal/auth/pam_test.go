package auth

import "testing"

func TestAuthHelpers(t *testing.T) {
	user := CurrentUsername()
	if user == "" {
		t.Errorf("expected non-empty username")
	}

	ok, err := VerifyPassword("")
	if ok || err == nil {
		t.Errorf("expected empty password to fail verification")
	}

	if err := TriggerExternalLocker("unsupported_locker"); err == nil {
		t.Errorf("expected error for unsupported external locker")
	}
}
