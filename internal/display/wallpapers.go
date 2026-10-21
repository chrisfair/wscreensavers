package display

import (
	"os"
	"sort"
	"strconv"
	"strings"
)

// otherWallpaperPrograms maps a process name (as in /proc/<pid>/comm) to a friendly name
// for wallpaper programs that draw on the background layer like the live wallpaper does.
var otherWallpaperPrograms = map[string]string{
	"hyprpaper":             "hyprpaper",
	"swww-daemon":           "swww",
	"awww-daemon":           "awww",
	"swaybg":                "swaybg",
	"mpvpaper":              "mpvpaper",
	"wpaperd":               "wpaperd",
	"linux-wallpaperengine": "linux-wallpaperengine",
}

// OtherWallpaperPrograms lists the other wallpaper programs currently running. The live
// wallpaper is drawn over them, so the user may want to turn them off. Noctalia's own
// wallpaper is part of the shell process and cannot be detected this way.
func OtherWallpaperPrograms() []string {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return nil
	}
	found := map[string]bool{}
	for _, e := range entries {
		if _, err := strconv.Atoi(e.Name()); err != nil {
			continue
		}
		comm, err := os.ReadFile("/proc/" + e.Name() + "/comm")
		if err != nil {
			continue
		}
		if name, ok := otherWallpaperPrograms[strings.TrimSpace(string(comm))]; ok {
			found[name] = true
		}
	}
	names := make([]string, 0, len(found))
	for n := range found {
		names = append(names, n)
	}
	sort.Strings(names)
	return names
}
