package support

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Live Stripe Payment Link URLs (shared with NewScid and bughouse-online) for the 5 classic tiers.
const (
	StripeLink1USD   = "https://buy.stripe.com/14A7sEgae18A5Mi3P2efC00" // $1 Pawn (3 Days)
	StripeLink5USD   = "https://buy.stripe.com/cNidR2e262cEeiOdpCefC01" // $5 Knight (1 Month)
	StripeLink10USD  = "https://buy.stripe.com/bJe3cogae5oQdeKgBOefC02" // $10 Rook (3 Months)
	StripeLink35USD  = "https://buy.stripe.com/aFa7sE2joeZqdeK99mefC03" // $35 Queen (1 Year)
	StripeLink350USD = "https://buy.stripe.com/6oUbIUf6a04w3Ea71eefC05" // $350 King (Lifetime)

	// DefaultStripeSupportURL is the default $5 Knight Stripe payment link.
	DefaultStripeSupportURL = StripeLink5USD
)

// DefaultMinSupportUSD is the minimum support contribution in USD ($1).
const DefaultMinSupportUSD = 1

// NagCooldownDuration is the 24-hour period that a dismissed support prompt stays hidden before showing again once per day.
const NagCooldownDuration = 24 * time.Hour

// Canonical author handles used to form the author computer exemption ID.
const (
	AuthorChessComPrimary = "christopherfair"
	AuthorChessComAlt     = "chrisfair"
	AuthorLichessPrimary  = "quenyenhighelf"
	AuthorLichessAlt      = "quenyen"
)

// StripeURLForAmount returns the live Stripe checkout link for the selected tier ($1, $5, $10, $35, $350).
func StripeURLForAmount(amountUSD int, customOverride string) string {
	if clean := strings.TrimSpace(customOverride); clean != "" && clean != DefaultStripeSupportURL {
		return clean
	}
	if envURL := strings.TrimSpace(os.Getenv("WSCREENSAVERS_STRIPE_URL")); envURL != "" {
		return envURL
	}
	if envURL := strings.TrimSpace(os.Getenv("NEWSCID_STRIPE_URL")); envURL != "" {
		return envURL
	}
	switch {
	case amountUSD >= 350:
		return StripeLink350USD
	case amountUSD >= 35:
		return StripeLink35USD
	case amountUSD >= 10:
		return StripeLink10USD
	case amountUSD >= 5:
		return StripeLink5USD
	default:
		return StripeLink1USD
	}
}

// CooldownForAmount returns the nag-free duration for a given support amount in USD,
// plus a human-readable tier label. A duration of 0 with lifetime=true means permanent.
func CooldownForAmount(amountUSD int) (time.Duration, string, bool) {
	switch {
	case amountUSD >= 350:
		return 0, "$350 King (Lifetime)", true
	case amountUSD >= 35:
		return 365 * 24 * time.Hour, "$35 Queen (1 Year)", false
	case amountUSD >= 10:
		return 90 * 24 * time.Hour, "$10 Rook (3 Months)", false
	case amountUSD >= 5:
		return 30 * 24 * time.Hour, "$5 Knight (1 Month)", false
	default:
		return 3 * 24 * time.Hour, "$1 Pawn (3 Days)", false
	}
}

// BuildCheckoutURL appends an optional client_reference_id if present.
func BuildCheckoutURL(baseURL string, clientRef string) string {
	cleanRef := strings.TrimSpace(clientRef)
	if cleanRef == "" {
		return baseURL
	}
	sep := "?"
	if strings.Contains(baseURL, "?") {
		sep = "&"
	}
	return baseURL + sep + "client_reference_id=" + url.QueryEscape(cleanRef)
}

// SupportConfig is persisted to ~/.config/wscreensavers/support.json.
type SupportConfig struct {
	Supported       bool   `json:"supported"`
	IsLifetime      bool   `json:"isLifetime,omitempty"`
	IsAuthor        bool   `json:"isAuthor"`
	AuthorID        string `json:"authorId,omitempty"`
	SupporterTier   string `json:"supporterTier,omitempty"`
	Reference       string `json:"reference,omitempty"`
	SupportedAt     int64  `json:"supportedAt,omitempty"`
	SupportedUntil  int64  `json:"supportedUntil,omitempty"`
	DismissCount    int    `json:"dismissCount"`
	LastDismissedAt int64  `json:"lastDismissedAt,omitempty"`
	StripeURL       string `json:"stripeUrl,omitempty"`
}

// SupportStatus is returned to the frontend UI to determine whether to show the support form.
type SupportStatus struct {
	Supported       bool           `json:"supported"`
	IsLifetime      bool           `json:"isLifetime"`
	IsAuthor        bool           `json:"isAuthor"`
	AuthorID        string         `json:"authorId,omitempty"`
	DeviceSignature string         `json:"deviceSignature,omitempty"`
	SupporterTier   string         `json:"supporterTier,omitempty"`
	SupportedAt     int64          `json:"supportedAt,omitempty"`
	SupportedUntil  int64          `json:"supportedUntil,omitempty"`
	DismissCount    int            `json:"dismissCount"`
	LastDismissedAt int64          `json:"lastDismissedAt,omitempty"`
	StripeURL       string         `json:"stripeUrl"`
	TierLinks       map[int]string `json:"tierLinks"`
	MinAmountUSD    int            `json:"minAmountUsd"`
	ShouldShowNag   bool           `json:"shouldShowNag"`
}

// Manager manages support/donation status, Stripe link configuration, and author ID exemption.
type Manager struct {
	mu         sync.RWMutex
	configPath string
	config     SupportConfig
}

// NewManager initializes a support manager backed by the given JSON file path.
// If configPath is empty, it defaults to ~/.config/wscreensavers/support.json.
func NewManager(configPath string) (*Manager, error) {
	if strings.TrimSpace(configPath) == "" {
		cfgDir, err := os.UserConfigDir()
		if err != nil {
			cfgDir = filepath.Join(os.Getenv("HOME"), ".config")
		}
		configPath = filepath.Join(cfgDir, "wscreensavers", "support.json")
	}

	m := &Manager{
		configPath: configPath,
		config: SupportConfig{
			StripeURL: resolveDefaultStripeURL(),
		},
	}

	_ = m.load()
	if strings.TrimSpace(m.config.StripeURL) == "" {
		m.config.StripeURL = resolveDefaultStripeURL()
	}

	return m, nil
}

func resolveDefaultStripeURL() string {
	if envURL := strings.TrimSpace(os.Getenv("WSCREENSAVERS_STRIPE_URL")); envURL != "" {
		return envURL
	}
	if envURL := strings.TrimSpace(os.Getenv("NEWSCID_STRIPE_URL")); envURL != "" {
		return envURL
	}
	return DefaultStripeSupportURL
}

func (m *Manager) load() error {
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return err
	}
	var cfg SupportConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return err
	}
	m.config = cfg
	return nil
}

func (m *Manager) save() error {
	if err := os.MkdirAll(filepath.Dir(m.configPath), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(m.config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.configPath, data, 0o644)
}

// BuildAuthorCompositeID constructs a deterministic author identifier from Chess.com and Lichess.org IDs.
func BuildAuthorCompositeID(chessComIDs []string, lichessIDs []string) (bool, string, string) {
	matchedChessCom := ""
	matchedLichess := ""

	for _, raw := range chessComIDs {
		norm := strings.ToLower(strings.TrimSpace(raw))
		if norm == AuthorChessComPrimary || norm == AuthorChessComAlt {
			matchedChessCom = strings.TrimSpace(raw)
			break
		}
	}

	for _, raw := range lichessIDs {
		norm := strings.ToLower(strings.TrimSpace(raw))
		if norm == AuthorLichessPrimary || norm == AuthorLichessAlt {
			matchedLichess = strings.TrimSpace(raw)
			break
		}
	}

	if matchedChessCom == "" && matchedLichess == "" {
		return false, "", ""
	}

	if matchedChessCom == "" {
		matchedChessCom = "ChristopherFair"
	}
	if matchedLichess == "" {
		matchedLichess = "QuenyenHighElf"
	}

	composite := "chess.com:" + matchedChessCom + "|lichess.org:" + matchedLichess
	sum := sha256.Sum256([]byte(strings.ToLower(composite)))
	sig := hex.EncodeToString(sum[:12])
	return true, composite, sig
}

// GetStatus evaluates current support status.
func (m *Manager) GetStatus(chessComIDs []string, lichessIDs []string) SupportStatus {
	m.mu.Lock()
	defer m.mu.Unlock()

	isAuthor, compositeID, sig := BuildAuthorCompositeID(chessComIDs, lichessIDs)
	if isAuthor && (!m.config.IsAuthor || m.config.AuthorID != compositeID) {
		m.config.IsAuthor = true
		m.config.Supported = true
		m.config.AuthorID = compositeID
		if m.config.SupporterTier == "" {
			m.config.SupporterTier = "Author"
		}
		if m.config.SupportedAt == 0 {
			m.config.SupportedAt = time.Now().UnixMilli()
		}
		_ = m.save()
	}

	return m.buildStatusLocked(sig)
}

func parseTierAmount(tier string) int {
	switch {
	case strings.Contains(tier, "350") || strings.Contains(strings.ToLower(tier), "lifetime") || strings.Contains(strings.ToLower(tier), "king"):
		return 350
	case strings.Contains(tier, "35") || strings.Contains(strings.ToLower(tier), "queen"):
		return 35
	case strings.Contains(tier, "10") || strings.Contains(strings.ToLower(tier), "rook"):
		return 10
	case strings.Contains(tier, "1") && !strings.Contains(tier, "10") && !strings.Contains(tier, "15") || strings.Contains(strings.ToLower(tier), "pawn"):
		return 1
	default:
		return 5
	}
}

// RecordSupport marks the user as having supported WScreenSavers for the duration corresponding to their tier.
func (m *Manager) RecordSupport(tier string, reference string) (SupportStatus, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	cleanTier := strings.TrimSpace(tier)
	amt := parseTierAmount(cleanTier)
	dur, canonicalLabel, isLifetime := CooldownForAmount(amt)
	if cleanTier == "" {
		cleanTier = canonicalLabel
	}
	cleanRef := strings.TrimSpace(reference)

	now := time.Now()
	isAuthor, compositeID, sig := BuildAuthorCompositeID([]string{cleanRef}, []string{cleanRef})
	if isAuthor {
		m.config.IsAuthor = true
		m.config.IsLifetime = true
		m.config.AuthorID = compositeID
		cleanTier = "Author"
		m.config.SupportedUntil = 0
	} else if isLifetime {
		m.config.IsLifetime = true
		m.config.SupportedUntil = 0
	} else {
		m.config.IsLifetime = false
		m.config.SupportedUntil = now.Add(dur).UnixMilli()
	}

	m.config.Supported = true
	m.config.SupporterTier = cleanTier
	m.config.Reference = cleanRef
	m.config.SupportedAt = now.UnixMilli()

	err := m.save()
	return m.buildStatusLocked(sig), err
}

// DismissNag records that the user dismissed the support prompt without donating (24-hour cooldown).
// The program remains 100% functional (non-obligatory).
func (m *Manager) DismissNag() (SupportStatus, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.config.DismissCount++
	m.config.LastDismissedAt = time.Now().UnixMilli()

	err := m.save()
	return m.buildStatusLocked(""), err
}

// SetStripeURL updates the Stripe payment link URL.
func (m *Manager) SetStripeURL(url string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	clean := strings.TrimSpace(url)
	if clean == "" {
		clean = resolveDefaultStripeURL()
	}
	m.config.StripeURL = clean
	return m.save()
}

func (m *Manager) buildStatusLocked(sig string) SupportStatus {
	if sig == "" && m.config.AuthorID != "" {
		sum := sha256.Sum256([]byte(strings.ToLower(m.config.AuthorID)))
		sig = hex.EncodeToString(sum[:12])
	}
	stripeURL := strings.TrimSpace(m.config.StripeURL)
	if stripeURL == "" {
		stripeURL = resolveDefaultStripeURL()
	}

	nowMs := time.Now().UnixMilli()
	activeSupport := false
	if m.config.IsAuthor || m.config.IsLifetime {
		activeSupport = true
	} else if m.config.Supported {
		if m.config.SupportedUntil > 0 {
			activeSupport = nowMs < m.config.SupportedUntil
		} else {
			activeSupport = true
		}
	}

	inDailyCooldown := false
	if !activeSupport && m.config.LastDismissedAt > 0 {
		elapsed := time.Since(time.UnixMilli(m.config.LastDismissedAt))
		if elapsed >= 0 && elapsed < NagCooldownDuration {
			inDailyCooldown = true
		}
	}

	return SupportStatus{
		Supported:       activeSupport,
		IsLifetime:      m.config.IsLifetime || m.config.IsAuthor,
		IsAuthor:        m.config.IsAuthor,
		AuthorID:        m.config.AuthorID,
		DeviceSignature: sig,
		SupporterTier:   m.config.SupporterTier,
		SupportedAt:     m.config.SupportedAt,
		SupportedUntil:  m.config.SupportedUntil,
		DismissCount:    m.config.DismissCount,
		LastDismissedAt: m.config.LastDismissedAt,
		StripeURL:       stripeURL,
		TierLinks: map[int]string{
			1:   StripeLink1USD,
			5:   StripeLink5USD,
			10:  StripeLink10USD,
			35:  StripeLink35USD,
			350: StripeLink350USD,
		},
		MinAmountUSD:  DefaultMinSupportUSD,
		ShouldShowNag: !activeSupport && !inDailyCooldown,
	}
}
