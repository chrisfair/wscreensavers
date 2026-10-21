package display

import "testing"

func TestOtherWallpaperProgramsIsSortedAndFriendlyNamed(t *testing.T) {
	for comm, name := range otherWallpaperPrograms {
		if comm == "" || name == "" {
			t.Errorf("empty entry for %q", comm)
		}
	}
	if otherWallpaperPrograms["swww-daemon"] != "swww" {
		t.Errorf("swww-daemon should be reported as swww")
	}
	// Whatever is running, the result must be a sorted list without duplicates.
	got := OtherWallpaperPrograms()
	for i := 1; i < len(got); i++ {
		if got[i-1] >= got[i] {
			t.Errorf("not sorted/unique: %v", got)
		}
	}
}
