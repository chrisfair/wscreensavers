package catalog

import (
	"strings"
	"wscreensavers/internal/models"
)

// nsfwSavers maps canonical lowercase saver names (without any "xss_" prefix)
// that are unsuitable for workplace displays due to rude gestures, profanity,
// drug themes, or unmoderated live-internet imagery.
var nsfwSavers = map[string]string{
	"handsy":     "3D animated hands including rude gestures",
	"webcollage": "Fetches unmoderated random images from the live internet",
	"vidwhacker": "Displays unmoderated external image and video frames",
	"noseguy":    "Displays random fortune quotes that may include profanity",
	"stonerview": "Drug-themed title and visuals",
}

func canonicalSaverName(id string) string {
	s := strings.ToLower(strings.TrimSpace(id))
	return strings.TrimPrefix(s, "xss_")
}

// IsNSFW reports whether saverID is flagged as not safe for work.
func IsNSFW(saverID string) bool {
	_, flagged := nsfwSavers[canonicalSaverName(saverID)]
	return flagged
}

// NSFWReason returns the workplace-filter reason for saverID, or "" if safe.
func NSFWReason(saverID string) string {
	return nsfwSavers[canonicalSaverName(saverID)]
}

// FilterSafeForWorkSavers removes NSFW savers from list when safeForWork is true.
func FilterSafeForWorkSavers(list []models.Screensaver, safeForWork bool) []models.Screensaver {
	if !safeForWork {
		return list
	}
	out := make([]models.Screensaver, 0, len(list))
	for _, s := range list {
		if !IsNSFW(s.ID) {
			out = append(out, s)
		}
	}
	return out
}

// FilterSafeForWorkIDs removes NSFW saver IDs from ids when safeForWork is true.
func FilterSafeForWorkIDs(ids []string, safeForWork bool) []string {
	if !safeForWork {
		return ids
	}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if !IsNSFW(id) {
			out = append(out, id)
		}
	}
	return out
}
