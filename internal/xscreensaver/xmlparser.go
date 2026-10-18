package xscreensaver

import (
	"encoding/xml"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"wscreensavers/internal/models"
)

// DefaultXScreenSaverPaths defines standard Linux system paths for xscreensaver XML configs and binaries.
var (
	DefaultConfigDirs = []string{
		"/usr/share/xscreensaver/config",
		"/usr/local/share/xscreensaver/config",
	}
	DefaultBinaryDirs = []string{
		"/usr/lib/xscreensaver",
		"/usr/libexec/xscreensaver",
		"/usr/local/lib/xscreensaver",
		"/usr/local/libexec/xscreensaver",
	}
)

// xmlScreenSaver represents the root <screensaver> element in XScreenSaver config XML files.
type xmlScreenSaver struct {
	XMLName     xml.Name `xml:"screensaver"`
	Name        string   `xml:"name,attr"`
	Label       string   `xml:"_label,attr"`
	GL          string   `xml:"gl,attr"`
	Description string   `xml:"_description"`
	RawChildren []xmlNode
}

type xmlNode struct {
	XMLName xml.Name
	Attrs   []xml.Attr `xml:",any,attr"`
	Nodes   []xmlNode  `xml:",any"`
	Content string     `xml:",chardata"`
}

func (n *xmlNode) attr(name string) string {
	for _, a := range n.Attrs {
		if a.Name.Local == name {
			return a.Value
		}
	}
	return ""
}

// UnmarshalXML custom unmarshaler to preserve nested layout tags (<hgroup>, <vgroup>) while extracting controls.
func (s *xmlScreenSaver) UnmarshalXML(d *xml.Decoder, start xml.StartElement) error {
	for _, a := range start.Attr {
		switch a.Name.Local {
		case "name":
			s.Name = a.Value
		case "_label", "label":
			s.Label = a.Value
		case "gl":
			s.GL = a.Value
		}
	}

	for {
		tok, err := d.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if se, ok := tok.(xml.StartElement); ok {
			if se.Name.Local == "_description" || se.Name.Local == "description" {
				var desc string
				if err := d.DecodeElement(&desc, &se); err == nil {
					s.Description = strings.TrimSpace(desc)
				}
			} else {
				var child xmlNode
				if err := d.DecodeElement(&child, &se); err == nil {
					s.RawChildren = append(s.RawChildren, child)
				}
			}
		}
	}
	return nil
}

// ParseXMLReader parses a single XScreenSaver XML configuration stream into a models.Screensaver.
func ParseXMLReader(r io.Reader, binaryPath string) (*models.Screensaver, error) {
	var raw xmlScreenSaver
	decoder := xml.NewDecoder(r)
	decoder.Strict = false
	decoder.CharsetReader = func(charset string, input io.Reader) (io.Reader, error) {
		return input, nil
	}
	if err := decoder.Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode xscreensaver xml: %w", err)
	}

	if raw.Name == "" {
		return nil, fmt.Errorf("xscreensaver xml missing name attribute")
	}

	label := raw.Label
	if label == "" {
		label = strings.Title(strings.ReplaceAll(raw.Name, "_", " "))
	}

	category := "XScreenSaver Classic"
	tags := []string{"xscreensaver", "external"}
	if raw.GL == "yes" || raw.GL == "true" {
		category = "XScreenSaver OpenGL"
		tags = append(tags, "opengl", "3d")
	}

	var params []models.SaverParam
	var baseArgs []string
	extractParams(raw.RawChildren, &params, &baseArgs)

	desc := cleanDescription(raw.Description)
	if desc == "" {
		desc = fmt.Sprintf("External XScreenSaver module (%s)", label)
	}

	return &models.Screensaver{
		ID:          "xss_" + raw.Name,
		Name:        label,
		Category:    category,
		Description: desc,
		Author:      "Jamie Zawinski & XScreenSaver Contributors",
		Year:        "1992-2026",
		Engine:      "xscreensaver",
		BinaryPath:  binaryPath,
		PreviewGrad: computeGradientForName(raw.Name, raw.GL == "yes"),
		Tags:        tags,
		Params:      params,
	}, nil
}

func extractParams(nodes []xmlNode, params *[]models.SaverParam, baseArgs *[]string) {
	for _, n := range nodes {
		switch n.XMLName.Local {
		case "hgroup", "vgroup":
			extractParams(n.Nodes, params, baseArgs)
		case "command":
			arg := n.attr("arg")
			if arg != "" {
				*baseArgs = append(*baseArgs, arg)
			}
		case "number":
			id := n.attr("id")
			if id == "" {
				continue
			}
			label := n.attr("_label")
			if label == "" {
				label = n.attr("label")
			}
			if label == "" {
				label = strings.Title(id)
			}
			low, _ := strconv.ParseFloat(n.attr("low"), 64)
			high, _ := strconv.ParseFloat(n.attr("high"), 64)
			def, _ := strconv.ParseFloat(n.attr("default"), 64)
			step := 1.0
			if n.attr("type") == "slider" && (high-low) <= 10.0 && (high-low) > 0 {
				if strings.Contains(n.attr("low"), ".") || strings.Contains(n.attr("high"), ".") || strings.Contains(n.attr("default"), ".") {
					step = 0.05
				}
			}
			*params = append(*params, models.SaverParam{
				ID:      id,
				Label:   label,
				Type:    "range",
				Default: def,
				Min:     low,
				Max:     high,
				Step:    step,
				ArgFlag: n.attr("arg"),
				Convert: n.attr("convert"),
			})
		case "boolean":
			id := n.attr("id")
			if id == "" {
				continue
			}
			label := n.attr("_label")
			if label == "" {
				label = n.attr("label")
			}
			if label == "" {
				label = strings.Title(id)
			}
			argSet := n.attr("arg-set")
			argUnset := n.attr("arg-unset")
			def := argUnset != "" && argSet == ""
			*params = append(*params, models.SaverParam{
				ID:          id,
				Label:       label,
				Type:        "boolean",
				Default:     def,
				ArgFlag:     argSet,
				ArgUnset:    argUnset,
				Description: label,
			})
		case "select":
			id := n.attr("id")
			if id == "" {
				continue
			}
			var options []models.SelectOption
			defaultVal := ""
			for _, opt := range n.Nodes {
				if opt.XMLName.Local != "option" {
					continue
				}
				optID := opt.attr("id")
				optLabel := opt.attr("_label")
				if optLabel == "" {
					optLabel = opt.attr("label")
				}
				if optLabel == "" {
					optLabel = optID
				}
				argSet := opt.attr("arg-set")
				if argSet == "" {
					defaultVal = optID
				}
				options = append(options, models.SelectOption{
					ID:     optID,
					Label:  optLabel,
					ArgSet: argSet,
				})
			}
			if defaultVal == "" && len(options) > 0 {
				defaultVal = options[0].ID
			}
			if len(options) > 0 {
				*params = append(*params, models.SaverParam{
					ID:      id,
					Label:   strings.Title(strings.ReplaceAll(id, "-", " ")),
					Type:    "select",
					Default: defaultVal,
					Options: options,
				})
			}
		case "string":
			id := n.attr("id")
			if id == "" {
				continue
			}
			label := n.attr("_label")
			if label == "" {
				label = strings.Title(id)
			}
			*params = append(*params, models.SaverParam{
				ID:      id,
				Label:   label,
				Type:    "string",
				Default: "",
				ArgFlag: n.attr("arg"),
			})
		}
	}
}

func cleanDescription(raw string) string {
	lines := strings.Split(raw, "\n")
	var kept []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") || strings.HasPrefix(trimmed, "Written by") {
			continue
		}
		kept = append(kept, trimmed)
	}
	res := strings.Join(kept, " ")
	if len(res) > 280 {
		res = res[:277] + "..."
	}
	return res
}

func computeGradientForName(name string, isGL bool) string {
	palettes := []string{
		"linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #3a506b 100%)",
		"linear-gradient(135deg, #10002b 0%, #240046 50%, #5a189a 100%)",
		"linear-gradient(135deg, #001219 0%, #005f73 50%, #0a9396 100%)",
		"linear-gradient(135deg, #1b0624 0%, #4a0e4e 50%, #811752 100%)",
		"linear-gradient(135deg, #081c15 0%, #1b4332 50%, #2d6a4f 100%)",
		"linear-gradient(135deg, #1f1108 0%, #5e2a0c 50%, #9c4100 100%)",
	}
	hash := 0
	for _, ch := range name {
		hash = (hash*31 + int(ch)) % len(palettes)
	}
	if hash < 0 {
		hash = -hash
	}
	return palettes[hash%len(palettes)]
}

// DiscoverSystemXScreenSavers scans standard system directories for installed XScreenSaver XML configs and binaries.
func DiscoverSystemXScreenSavers(existingNativeNames map[string]bool) []models.Screensaver {
	var discovered []models.Screensaver
	seen := make(map[string]bool)

	for _, cfgDir := range DefaultConfigDirs {
		entries, err := os.ReadDir(cfgDir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".xml") {
				continue
			}
			baseName := strings.TrimSuffix(entry.Name(), ".xml")
			if seen[baseName] {
				continue
			}
			seen[baseName] = true

			binPath := findBinary(baseName)
			if binPath == "" {
				continue
			}

			xmlPath := filepath.Join(cfgDir, entry.Name())
			f, err := os.Open(xmlPath)
			if err != nil {
				continue
			}
			saver, err := ParseXMLReader(f, binPath)
			f.Close()
			if err != nil || saver == nil {
				continue
			}
			if existingNativeNames != nil && existingNativeNames[strings.ToLower(baseName)] {
				saver.Name = saver.Name + " (X11 Binary)"
			}
			discovered = append(discovered, *saver)
		}
	}
	return discovered
}

func findBinary(name string) string {
	for _, dir := range DefaultBinaryDirs {
		candidate := filepath.Join(dir, name)
		info, err := os.Stat(candidate)
		if err == nil && !info.IsDir() && (info.Mode()&0111 != 0) {
			return candidate
		}
	}
	return ""
}

// BuildCommandArgs converts a Screensaver's parameter schema and user parameter map into CLI arguments.
func BuildCommandArgs(saver models.Screensaver, values map[string]any) []string {
	var args []string
	args = append(args, "-root")

	for _, p := range saver.Params {
		val, exists := values[p.ID]
		if !exists {
			val = p.Default
		}

		switch p.Type {
		case "range":
			if p.ArgFlag == "" {
				continue
			}
			var num float64
			switch v := val.(type) {
			case float64:
				num = v
			case int:
				num = float64(v)
			case string:
				num, _ = strconv.ParseFloat(v, 64)
			}
			if p.Convert == "invert" {
				num = p.Max + p.Min - num
			}
			formatted := strconv.FormatFloat(num, 'f', -1, 64)
			parts := strings.Fields(strings.ReplaceAll(p.ArgFlag, "%", formatted))
			args = append(args, parts...)

		case "boolean":
			b, _ := val.(bool)
			if b && p.ArgFlag != "" {
				args = append(args, strings.Fields(p.ArgFlag)...)
			} else if !b && p.ArgUnset != "" {
				args = append(args, strings.Fields(p.ArgUnset)...)
			}

		case "select":
			selID, _ := val.(string)
			for _, opt := range p.Options {
				if opt.ID == selID && opt.ArgSet != "" {
					args = append(args, strings.Fields(opt.ArgSet)...)
					break
				}
			}

		case "string":
			str, _ := val.(string)
			if str != "" && p.ArgFlag != "" {
				parts := strings.Fields(strings.ReplaceAll(p.ArgFlag, "%", str))
				args = append(args, parts...)
			}
		}
	}
	return args
}
