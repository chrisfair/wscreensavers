package xscreensaver

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"math"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
	"wscreensavers/internal/models"
)

const CelestiaTourSaverID = "xss_celestia_tour"

var (
	// DefaultCelestiaBinaryPaths lists candidate locations for the native Celestia executable.
	DefaultCelestiaBinaryPaths = []string{
		"/usr/bin/celestia",
		"/usr/local/bin/celestia",
	}
	// DefaultCelestiaDataDirs lists candidate locations for Celestia's data, shader, and texture root.
	DefaultCelestiaDataDirs = []string{
		"/usr/share/celestia",
		"/usr/local/share/celestia",
	}
)

type celestiaStop struct {
	Path      string
	Title     string
	Group     string // "sun", "planet", "moon", "spacecraft", "small"
	OrbitAU   float64
	DistRadii float64
	TiltDeg   float64
	OrbitRate float64
}

var celestiaCatalogStops = []celestiaStop{
	{Path: "Sol", Title: "Sol — G2V Main-Sequence Star & Photosphere", Group: "sun", OrbitAU: 0.00, DistRadii: 8.5, TiltDeg: 10, OrbitRate: 15},
	{Path: "Sol/Mercury", Title: "Mercury — Caloris Basin & Rayed Crater Regolith", Group: "planet", OrbitAU: 0.39, DistRadii: 4.3, TiltDeg: 14, OrbitRate: 18},
	{Path: "Sol/Venus", Title: "Venus — Super-Rotating Sulfuric Cloud Deck", Group: "planet", OrbitAU: 0.72, DistRadii: 4.2, TiltDeg: 12, OrbitRate: -17},
	{Path: "Sol/Earth", Title: "Earth — Specular Oceans, Clouds & Terminator City Lights", Group: "planet", OrbitAU: 1.00, DistRadii: 4.0, TiltDeg: 18, OrbitRate: 17},
	{Path: "Sol/Earth/ISS", Title: "International Space Station — Low Earth Orbit", Group: "spacecraft", OrbitAU: 1.001, DistRadii: 3.9, TiltDeg: 20, OrbitRate: 22},
	{Path: "Sol/Earth/Hubble", Title: "Hubble Space Telescope — Orbital Observatory", Group: "spacecraft", OrbitAU: 1.002, DistRadii: 4.2, TiltDeg: 18, OrbitRate: 22},
	{Path: "Sol/Earth/Moon", Title: "Luna — Mare Basalts & Highland Impact Basins", Group: "moon", OrbitAU: 1.003, DistRadii: 4.2, TiltDeg: 14, OrbitRate: 18},
	{Path: "Sol/Eros", Title: "433 Eros — Near-Earth Silicate Asteroid", Group: "small", OrbitAU: 1.46, DistRadii: 4.5, TiltDeg: 20, OrbitRate: 23},
	{Path: "Sol/Itokawa", Title: "25143 Itokawa — Rubble-Pile Near-Earth Asteroid", Group: "small", OrbitAU: 1.32, DistRadii: 4.4, TiltDeg: 18, OrbitRate: 23},
	{Path: "Sol/Mars", Title: "Mars — Valles Marineris, Tharsis Montes & Polar Caps", Group: "planet", OrbitAU: 1.52, DistRadii: 4.2, TiltDeg: 18, OrbitRate: 18},
	{Path: "Sol/Mars/Phobos", Title: "Phobos — Stickney Crater Above the Martian Limb", Group: "small", OrbitAU: 1.521, DistRadii: 4.4, TiltDeg: 16, OrbitRate: 22},
	{Path: "Sol/Vesta", Title: "4 Vesta — Differentiated Main-Belt Protoplanet", Group: "small", OrbitAU: 2.36, DistRadii: 4.3, TiltDeg: 16, OrbitRate: 20},
	{Path: "Sol/Ida", Title: "243 Ida & Dactyl — Main-Belt Binary Asteroid", Group: "small", OrbitAU: 2.86, DistRadii: 4.5, TiltDeg: 18, OrbitRate: 21},
	{Path: "Sol/Jupiter", Title: "Jupiter — Zonal Cloud Belts & Great Red Spot", Group: "planet", OrbitAU: 5.20, DistRadii: 4.6, TiltDeg: 12, OrbitRate: 17},
	{Path: "Sol/Jupiter/Io", Title: "Io — Tidal Volcanism in the Jovian System", Group: "moon", OrbitAU: 5.201, DistRadii: 4.2, TiltDeg: 14, OrbitRate: 20},
	{Path: "Sol/Jupiter/Europa", Title: "Europa — Tectonic Ice Lineae & Subsurface Ocean", Group: "moon", OrbitAU: 5.202, DistRadii: 4.2, TiltDeg: 16, OrbitRate: 20},
	{Path: "Sol/Jupiter/Ganymede", Title: "Ganymede — Grooved Water-Ice & Ancient Regolith", Group: "moon", OrbitAU: 5.203, DistRadii: 4.3, TiltDeg: 14, OrbitRate: 18},
	{Path: "Sol/Jupiter/Callisto", Title: "Callisto — Valhalla Multi-Ring Impact Basin", Group: "moon", OrbitAU: 5.204, DistRadii: 4.3, TiltDeg: 14, OrbitRate: 18},
	{Path: "Sol/Saturn", Title: "Saturn — Illuminated A/B/C Rings & Cassini Division", Group: "planet", OrbitAU: 9.58, DistRadii: 5.1, TiltDeg: 24, OrbitRate: 16},
	{Path: "Sol/Saturn/Mimas", Title: "Mimas — Herschel Crater Inside the Cronian System", Group: "moon", OrbitAU: 9.581, DistRadii: 4.3, TiltDeg: 16, OrbitRate: 20},
	{Path: "Sol/Saturn/Enceladus", Title: "Enceladus — South-Polar Cryovolcanic Ice World", Group: "moon", OrbitAU: 9.582, DistRadii: 4.2, TiltDeg: 18, OrbitRate: 20},
	{Path: "Sol/Saturn/Dione", Title: "Dione — Bright Tectonic Ice Cliffs", Group: "moon", OrbitAU: 9.583, DistRadii: 4.2, TiltDeg: 16, OrbitRate: 19},
	{Path: "Sol/Saturn/Rhea", Title: "Rhea — Cratered Cronian Ice Moon", Group: "moon", OrbitAU: 9.584, DistRadii: 4.2, TiltDeg: 15, OrbitRate: 18},
	{Path: "Sol/Saturn/Titan", Title: "Titan — Dense Nitrogen-Methane Stratospheric Haze", Group: "moon", OrbitAU: 9.585, DistRadii: 4.4, TiltDeg: 16, OrbitRate: 18},
	{Path: "Sol/Saturn/Iapetus", Title: "Iapetus — Two-Tone Cassini Regio & Equatorial Ridge", Group: "moon", OrbitAU: 9.586, DistRadii: 4.3, TiltDeg: 16, OrbitRate: 19},
	{Path: "Sol/Uranus", Title: "Uranus — 98° Axial Tilt & Epsilon Ring System", Group: "planet", OrbitAU: 19.20, DistRadii: 4.8, TiltDeg: 22, OrbitRate: 17},
	{Path: "Sol/Uranus/Miranda", Title: "Miranda — Coronae & Verona Rupes Ice Scarps", Group: "moon", OrbitAU: 19.201, DistRadii: 4.2, TiltDeg: 18, OrbitRate: 20},
	{Path: "Sol/Neptune", Title: "Neptune — Deep Methane Atmosphere & Supersonic Winds", Group: "planet", OrbitAU: 30.05, DistRadii: 4.6, TiltDeg: 18, OrbitRate: 18},
	{Path: "Sol/Neptune/Triton", Title: "Triton — Retrograde Captured Kuiper Belt World", Group: "moon", OrbitAU: 30.051, DistRadii: 4.2, TiltDeg: 16, OrbitRate: 20},
	{Path: "Sol/Pluto", Title: "Pluto — Nitrogen Ice Plains of the Kuiper Belt", Group: "planet", OrbitAU: 39.48, DistRadii: 4.6, TiltDeg: 18, OrbitRate: 18},
	{Path: "Sol/Pluto/Charon", Title: "Charon — Tidally Locked Binary Companion", Group: "moon", OrbitAU: 39.481, DistRadii: 4.4, TiltDeg: 16, OrbitRate: 20},
}

func findCelestiaBinary() string {
	for _, p := range DefaultCelestiaBinaryPaths {
		if info, err := os.Stat(p); err == nil && !info.IsDir() && (info.Mode()&0111 != 0) {
			return p
		}
	}
	if p, err := exec.LookPath("celestia"); err == nil && p != "" {
		return p
	}
	return ""
}

func findCelestiaDataDir() string {
	for _, d := range DefaultCelestiaDataDirs {
		cfgPath := filepath.Join(d, "celestia.cfg")
		if info, err := os.Stat(cfgPath); err == nil && !info.IsDir() {
			return d
		}
	}
	return ""
}

// IsCelestiaTourSaver reports whether saver uses the external Celestia 1.6 OpenGL engine.
func IsCelestiaTourSaver(saver models.Screensaver) bool {
	return saver.ID == CelestiaTourSaverID || saver.Engine == "celestia"
}

// DiscoverExternalEngines probes for non-XML external 3D engines such as Celestia (/usr/bin/celestia).
func DiscoverExternalEngines() []models.Screensaver {
	sv := DiscoverCelestiaSaver()
	if sv == nil {
		return nil
	}
	return []models.Screensaver{*sv}
}

// DiscoverCelestiaSaver returns a catalog entry for the native Celestia 1.6 engine when installed.
func DiscoverCelestiaSaver() *models.Screensaver {
	binPath := findCelestiaBinary()
	dataDir := findCelestiaDataDir()
	if binPath == "" || dataDir == "" {
		return nil
	}

	return &models.Screensaver{
		ID:          CelestiaTourSaverID,
		Name:        "Celestia 1.6: Solar System Grand Tour",
		Category:    "Space & Physics",
		Source:      models.SourceXScreenSaver,
		Engine:      "celestia",
		Author:      "Chris Laurel & Celestia Project / WScreenSavers Tour Script",
		Year:        "2001-2026",
		BinaryPath:  binPath,
		BaseArgs:    []string{"-s"},
		AccentColor: "#38bdf8",
		PreviewGrad: "linear-gradient(135deg, #060b19 0%, #0284c7 55%, #38bdf8 100%)",
		Tags:        []string{"Celestia", "Solar System", "NASA", "Planets", "Spacecraft", "3D", "OpenGL", "Astronomy"},
		Description: "Runs the real Celestia 1.6 3D astronomy engine across sunlit planetary crescents, JPL/Cassini high-resolution moon maps, Saturn ring shadows, the ISS, Hubble, and sculpted 3D asteroids.",
		Installed:   true,
		Params: []models.SaverParam{
			{
				ID:      "route",
				Label:   "Tour Itinerary",
				Type:    models.ParamSelect,
				Default: "grand_tour",
				Options: []models.SelectOption{
					{ID: "grand_tour", Value: "grand_tour", Label: "Full Solar System Grand Tour (Sol → Kuiper Belt)"},
					{ID: "randomized", Value: "randomized", Label: "Randomized Expedition (Shuffled Every Cycle)"},
					{ID: "planets_only", Value: "planets_only", Label: "Major Planets Only (Sol & Mercury → Pluto)"},
					{ID: "giants_moons", Value: "giants_moons", Label: "Gas & Ice Giants, Rings & Iconic Moons"},
					{ID: "earth_orbital", Value: "earth_orbital", Label: "Earth, Luna, ISS & Hubble Space Telescope"},
					{ID: "small_worlds", Value: "small_worlds", Label: "Mars, Phobos & 3D Asteroids (Eros, Itokawa, Vesta, Ida)"},
				},
			},
			{
				ID:        "dwellSeconds",
				Label:     "Orbital Flyby Duration (Seconds)",
				Type:      models.ParamRange,
				Default:   14.0,
				Min:       6.0,
				Max:       40.0,
				Step:      2.0,
				LowLabel:  "6s",
				HighLabel: "40s",
			},
			{
				ID:        "travelSeconds",
				Label:     "Interplanetary Flight Time (Seconds)",
				Type:      models.ParamRange,
				Default:   4.5,
				Min:       2.0,
				Max:       10.0,
				Step:      0.5,
				LowLabel:  "Fast",
				HighLabel: "Cruise",
			},
			{
				ID:      "hudMode",
				Label:   "Astronomical Telemetry & Captions",
				Type:    models.ParamSelect,
				Default: "terse",
				Options: []models.SelectOption{
					{ID: "terse", Value: "terse", Label: "Standard Telemetry + Destination Captions"},
					{ID: "verbose", Value: "verbose", Label: "Full Ephemeris Telemetry + Captions"},
					{ID: "captions", Value: "captions", Label: "Clean Cinema + Destination Captions Only"},
					{ID: "none", Value: "none", Label: "Pure Cinema (Zero Text Overlay)"},
				},
			},
			{
				ID:        "ambientLight",
				Label:     "Night-Side Starlight / Planetshine",
				Type:      models.ParamRange,
				Default:   0.14,
				Min:       0.00,
				Max:       0.35,
				Step:      0.02,
				LowLabel:  "Pitch Dark",
				HighLabel: "Bright",
			},
			{
				ID:      "showOrbits",
				Label:   "Show Planetary & Lunar Orbit Paths",
				Type:    models.ParamBoolean,
				Default: false,
			},
			{
				ID:      "showLabels",
				Label:   "Show Planet, Moon & Spacecraft Labels",
				Type:    models.ParamBoolean,
				Default: false,
			},
			{
				ID:      "staggerMonitors",
				Label:   "Stagger Starting World Across Multiple Monitors",
				Type:    models.ParamBoolean,
				Default: true,
			},
		},
	}
}

type celestiaTourSettings struct {
	Route           string
	DwellSeconds    float64
	TravelSeconds   float64
	HudMode         string
	AmbientLight    float64
	ShowOrbits      bool
	ShowLabels      bool
	StaggerMonitors bool
}

func parseCelestiaSettings(values map[string]any) celestiaTourSettings {
	cfg := celestiaTourSettings{
		Route:           "grand_tour",
		DwellSeconds:    14.0,
		TravelSeconds:   4.5,
		HudMode:         "terse",
		AmbientLight:    0.14,
		ShowOrbits:      false,
		ShowLabels:      false,
		StaggerMonitors: true,
	}
	if len(values) == 0 {
		return cfg
	}
	if v, ok := values["route"].(string); ok && v != "" {
		cfg.Route = v
	}
	if v, ok := asFloat(values["dwellSeconds"]); ok {
		cfg.DwellSeconds = math.Max(4.0, math.Min(60.0, v))
	}
	if v, ok := asFloat(values["travelSeconds"]); ok {
		cfg.TravelSeconds = math.Max(1.5, math.Min(15.0, v))
	}
	if v, ok := values["hudMode"].(string); ok && v != "" {
		cfg.HudMode = v
	}
	if v, ok := asFloat(values["ambientLight"]); ok {
		cfg.AmbientLight = math.Max(0.0, math.Min(0.5, v))
	}
	if v, ok := values["showOrbits"].(bool); ok {
		cfg.ShowOrbits = v
	}
	if v, ok := values["showLabels"].(bool); ok {
		cfg.ShowLabels = v
	}
	if v, ok := values["staggerMonitors"].(bool); ok {
		cfg.StaggerMonitors = v
	}
	return cfg
}

func asFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	default:
		return 0, false
	}
}

// CelestiaConfigKey returns a deterministic cache key for a running Celestia session.
func CelestiaConfigKey(width, height int, values map[string]any) string {
	parsed := parseCelestiaSettings(values)
	raw, _ := json.Marshal(parsed)
	return fmt.Sprintf("celestia:%dx%d:%s", width, height, string(raw))
}

func filterStopsForRoute(route string) []celestiaStop {
	var out []celestiaStop
	for _, s := range celestiaCatalogStops {
		switch route {
		case "planets_only":
			if s.Group == "sun" || s.Group == "planet" {
				out = append(out, s)
			}
		case "giants_moons":
			if s.OrbitAU >= 5.0 {
				out = append(out, s)
			}
		case "earth_orbital":
			if s.Path == "Sol" || strings.HasPrefix(s.Path, "Sol/Earth") {
				out = append(out, s)
			}
		case "small_worlds":
			if s.Path == "Sol/Mars" || s.Group == "small" {
				out = append(out, s)
			}
		default:
			out = append(out, s)
		}
	}
	if len(out) == 0 {
		out = append(out, celestiaCatalogStops...)
	}
	return out
}

func sessionOffset(sessionKey string, count int) int {
	if count <= 1 || sessionKey == "" || sessionKey == "default" {
		return 0
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(sessionKey))
	// Multiply by golden-ratio prime step so adjacent monitor names land far apart in the Solar System.
	return int((uint64(h.Sum32()) * 7) % uint64(count))
}

func buildCelestiaTourScript(sessionKey string, cfg celestiaTourSettings) string {
	baseStops := filterStopsForRoute(cfg.Route)
	var b strings.Builder
	b.Grow(131072)

	b.WriteString("{\n")
	b.WriteString("  set { name \"FOV\" value 32.0 }\n")
	b.WriteString(fmt.Sprintf("  set { name \"AmbientLightLevel\" value %.2f }\n", cfg.AmbientLight))
	b.WriteString("  timerate { rate 1.0 }\n")

	setFlags := "stars|planets|galaxies|cloudmaps|nightmaps|atmospheres|ringshadows|eclipseshadows|comettails"
	clearFlags := "constellations|boundaries|markers"
	if cfg.ShowOrbits {
		setFlags += "|orbits"
	} else {
		clearFlags += "|orbits"
	}
	b.WriteString(fmt.Sprintf("  renderflags { set %q clear %q }\n", setFlags, clearFlags))

	if cfg.ShowLabels {
		b.WriteString("  labels { set \"planets|moons|spacecraft|asteroids\" clear \"constellations|stars|galaxies\" }\n")
	} else {
		b.WriteString("  labels { clear \"planets|moons|spacecraft|asteroids|constellations|stars|galaxies\" }\n")
	}

	// Preload primary planetary textures up front so initial transitions never hitch.
	for _, preload := range []string{"Sol/Earth", "Sol/Earth/Moon", "Sol/Mars", "Sol/Jupiter", "Sol/Saturn"} {
		b.WriteString(fmt.Sprintf("  preloadtex { object %q }\n", preload))
	}

	// Stage near Sol initially so the very first interplanetary slew approaches from the sunlit side.
	b.WriteString("  select { object \"Sol\" }\n")
	b.WriteString("  gotoloc { time 0.0 position [ 0 0 4500000 ] }\n")
	b.WriteString("  wait { duration 0.05 }\n\n")

	showCaptions := cfg.HudMode != "none"
	startOffset := 0
	if cfg.StaggerMonitors {
		startOffset = sessionOffset(sessionKey, len(baseStops))
	}

	seed := time.Now().UnixNano() + int64(startOffset)*9973
	rng := rand.New(rand.NewSource(seed))

	const totalCycles = 24
	prevAU := -1.0

	for cycle := 0; cycle < totalCycles; cycle++ {
		stops := make([]celestiaStop, len(baseStops))
		if cfg.Route == "randomized" {
			copy(stops, baseStops)
			rng.Shuffle(len(stops), func(i, j int) {
				stops[i], stops[j] = stops[j], stops[i]
			})
		} else {
			for i := range baseStops {
				idx := (i + startOffset) % len(baseStops)
				stops[i] = baseStops[idx]
			}
			// After the staggered first pass, subsequent cycles run the natural Sol -> outer frontier sweep.
			startOffset = 0
		}

		for _, stop := range stops {
			travel := cfg.TravelSeconds
			if prevAU < 0 {
				// Fast initial arrival when the screensaver first opens so the screen fills with a world immediately.
				travel = 1.2
			} else if stop.Path != "Sol" && prevAU > stop.OrbitAU+0.05 {
				// Moving inward toward the Sun would approach a planet's night side.
				// Stage briefly past an inner sunward vantage so every arrival lands on a sunlit crescent.
				b.WriteString("  select { object \"Sol\" }\n")
				b.WriteString("  follow {}\n")
				b.WriteString("  goto { time 2.2 distance 16.0 up [ 0 1 0 ] upframe \"equatorial\" }\n")
				b.WriteString("  wait { duration 2.3 }\n")
			}

			b.WriteString(fmt.Sprintf("  preloadtex { object %q }\n", stop.Path))
			b.WriteString(fmt.Sprintf("  select { object %q }\n", stop.Path))
			b.WriteString("  follow {}\n")
			b.WriteString(fmt.Sprintf("  goto { time %.2f distance %.2f up [ 0 1 0 ] upframe \"equatorial\" }\n", travel, stop.DistRadii))
			b.WriteString(fmt.Sprintf("  wait { duration %.2f }\n", travel+0.15))

			tiltDur := 1.4
			if stop.TiltDeg > 0 && cfg.DwellSeconds > 3.0 {
				tiltRate := stop.TiltDeg / tiltDur
				b.WriteString(fmt.Sprintf("  orbit { axis [ 1 0 0 ] rate %.2f duration %.2f }\n", tiltRate, tiltDur))
			} else {
				tiltDur = 0.0
			}

			remDwell := math.Max(3.0, cfg.DwellSeconds-tiltDur)
			if showCaptions {
				captionDur := math.Min(remDwell-0.4, 8.5)
				if captionDur < 2.0 {
					captionDur = remDwell
				}
				b.WriteString(fmt.Sprintf("  print { text %q row -3 column 2 duration %.2f }\n", stop.Title, captionDur))
			}
			b.WriteString(fmt.Sprintf("  orbit { axis [ 0 1 0 ] rate %.2f duration %.2f }\n\n", stop.OrbitRate, remDwell))
			prevAU = stop.OrbitAU
		}

		// Between full cycles, pull back above the inner Solar System for a brief orbital time-lapse overview.
		b.WriteString("  select { object \"Sol\" }\n")
		b.WriteString("  follow {}\n")
		b.WriteString("  goto { time 3.5 distance 240.0 up [ 0 1 0 ] upframe \"equatorial\" }\n")
		b.WriteString("  wait { duration 3.6 }\n")
		b.WriteString("  orbit { axis [ 1 0 0 ] rate 22.0 duration 2.5 }\n")
		b.WriteString("  renderflags { set \"orbits\" }\n")
		if showCaptions {
			b.WriteString("  print { text \"Inner Solar System — Heliocentric Orbital Motion (20 Days / Sec)\" row -3 column 2 duration 6.5 }\n")
		}
		b.WriteString("  timerate { rate 1728000.0 }\n")
		b.WriteString("  orbit { axis [ 0 1 0 ] rate 10.0 duration 7.0 }\n")
		b.WriteString("  timerate { rate 1.0 }\n")
		if !cfg.ShowOrbits {
			b.WriteString("  renderflags { clear \"orbits\" }\n")
		}
		b.WriteString("  goto { time 2.0 distance 14.0 up [ 0 1 0 ] upframe \"equatorial\" }\n")
		b.WriteString("  wait { duration 2.1 }\n\n")
		prevAU = 0.0
	}

	b.WriteString("}\n")
	return b.String()
}

func buildCelestiaRC(width, height int, cfg celestiaTourSettings) string {
	verbosity := 1
	switch cfg.HudMode {
	case "verbose":
		verbosity = 2
	case "captions", "none":
		verbosity = 0
	default:
		verbosity = 1
	}
	ambientInt := int(math.Round(cfg.AmbientLight * 1000.0))

	return fmt.Sprintf(`[Main]
ambientLight=%d
visualMagnitude=8500
galaxyLightGain=220
distanceLimit=1000000
localTime=true
verbosity=%d
starStyle=0
textureResolution=2
altSurfaceName=
videoSync=true

[Window]
width=%d
height=%d
x=0
y=0
fullScreen=false

[RenderFlags]
stars=true
planets=true
galaxies=true
diagrams=false
cloudMaps=true
orbits=%t
celestialSphere=false
nightMaps=true
atmospheres=true
smoothLines=true
eclipseShadows=true
ringShadows=true
boundaries=false
autoMag=true
cometTails=true
markers=false
partialTrajectories=false
nebulae=true
openClusters=false
globulars=false
gridGalactic=false
gridEcliptic=false
gridHorizontal=false

[OrbitMask]
planet=true
moon=true
asteroid=false
comet=true
spacecraft=true
invisible=false
unknown=false

[LabelMode]
star=false
planet=%t
moon=%t
constellation=false
galaxy=false
asteroid=%t
spacecraft=%t
location=false
comet=false
nebula=false
opencluster=false
i18n=false
globular=false
`, ambientInt, verbosity, width, height, cfg.ShowOrbits, cfg.ShowLabels, cfg.ShowLabels, cfg.ShowLabels, cfg.ShowLabels)
}

func rewriteCelestiaCfg(baseCfg string) string {
	replacer := strings.NewReplacer(
		`InitScript  "start.cel"`, `InitScript  "tour.cel"`,
		`LogoTexture  "logo.png"`, `LogoTexture  ""`,
		`OrbitPathSamplePoints  100`, `OrbitPathSamplePoints  200`,
		`RingSystemSections     100`, `RingSystemSections     240`,
		`ShadowTextureSize      256`, `ShadowTextureSize      1024`,
		`EclipseTextureSize     128`, `EclipseTextureSize     512`,
		`# AntialiasingSamples        4`, `AntialiasingSamples        4`,
	)
	return replacer.Replace(baseCfg)
}

// PrepareCelestiaSession materializes an isolated temporary Celestia runtime directory
// (custom borderless UI XML, high-detail celestia.cfg, per-session .celestiarc, and generated tour.cel)
// so /usr/bin/celestia renders edge-to-edge on Xvfb without touching the user's ~/.celestiarc.
func PrepareCelestiaSession(sessionKey string, displayNum, width, height int, values map[string]any) (binPath string, args []string, extraEnv []string, tempDir string, err error) {
	binPath = findCelestiaBinary()
	dataDir := findCelestiaDataDir()
	if binPath == "" || dataDir == "" {
		return "", nil, nil, "", fmt.Errorf("celestia binary or /usr/share/celestia data directory not found")
	}

	if width <= 0 {
		width = defaultWidth
	}
	if height <= 0 {
		height = defaultHeight
	}

	baseTmp := filepath.Join(os.TempDir(), fmt.Sprintf("wscreensavers-celestia-%d-%d", os.Getpid(), displayNum))
	_ = os.RemoveAll(baseTmp)
	homeDir := filepath.Join(baseTmp, "home")
	rootDir := filepath.Join(baseTmp, "root")
	if err := os.MkdirAll(homeDir, 0700); err != nil {
		return "", nil, nil, "", err
	}
	if err := os.MkdirAll(rootDir, 0700); err != nil {
		_ = os.RemoveAll(baseTmp)
		return "", nil, nil, "", err
	}

	entries, err := os.ReadDir(dataDir)
	if err != nil {
		_ = os.RemoveAll(baseTmp)
		return "", nil, nil, "", err
	}
	for _, entry := range entries {
		name := entry.Name()
		if name == "celestia.cfg" || name == "celestiaui.xml" {
			continue
		}
		_ = os.Symlink(filepath.Join(dataDir, name), filepath.Join(rootDir, name))
	}

	// Empty GtkUIManager root omits the GTK2 menu bar so the OpenGL viewport occupies (0,0)-(width,height).
	if err := os.WriteFile(filepath.Join(rootDir, "celestiaui.xml"), []byte("<ui/>\n"), 0600); err != nil {
		_ = os.RemoveAll(baseTmp)
		return "", nil, nil, "", err
	}

	rawCfg, err := os.ReadFile(filepath.Join(dataDir, "celestia.cfg"))
	if err != nil {
		_ = os.RemoveAll(baseTmp)
		return "", nil, nil, "", err
	}
	cfgPath := filepath.Join(rootDir, "celestia.cfg")
	if err := os.WriteFile(cfgPath, []byte(rewriteCelestiaCfg(string(rawCfg))), 0600); err != nil {
		_ = os.RemoveAll(baseTmp)
		return "", nil, nil, "", err
	}

	settings := parseCelestiaSettings(values)
	if err := os.WriteFile(filepath.Join(homeDir, ".celestiarc"), []byte(buildCelestiaRC(width, height, settings)), 0600); err != nil {
		_ = os.RemoveAll(baseTmp)
		return "", nil, nil, "", err
	}

	tourScript := buildCelestiaTourScript(sessionKey, settings)
	if err := os.WriteFile(filepath.Join(rootDir, "tour.cel"), []byte(tourScript), 0600); err != nil {
		_ = os.RemoveAll(baseTmp)
		return "", nil, nil, "", err
	}

	args = []string{"-s", "-d", rootDir, "-c", cfgPath}
	extraEnv = []string{
		"HOME=" + homeDir,
		"LP_NUM_THREADS=2",
	}
	return binPath, args, extraEnv, baseTmp, nil
}
