package xscreensaver

import (
	"strings"
	"testing"
)

const sampleGLMatrixXML = `<?xml version="1.0" encoding="ISO-8859-1"?>
<screensaver name="glmatrix" _label="GLMatrix" gl="yes">
  <command arg="-root"/>
  <video href="https://www.youtube.com/watch?v=example"/>
  <hgroup>
   <vgroup>
    <number id="delay" type="slider" arg="-delay %"
            _label="Frame rate" _low-label="Low" _high-label="High"
            low="0" high="100000" default="30000"
            convert="invert"/>
    <number id="speed" type="slider" arg="-speed %"
            _label="Speed" _low-label="Slow" _high-label="Fast"
            low="0.1" high="5.0" default="1.0"/>
    <number id="density" type="slider" arg="-density %"
            _label="Density" _low-label="Sparse" _high-label="Dense"
            low="2" high="200" default="20"/>
   </vgroup>
   <vgroup>
    <boolean id="fog" _label="Fog" arg-unset="-no-fog"/>
    <boolean id="waves" _label="Waves" arg-unset="-no-waves"/>
    <boolean id="rotate" _label="Rotate" arg-unset="-no-rotate"/>
    <select id="mode">
      <option id="matrix" _label="Matrix" />
      <option id="dna"    _label="DNA"       arg-set="-mode dna"/>
      <option id="binary" _label="Binary"    arg-set="-mode binary"/>
      <option id="hex"    _label="Hexadecimal" arg-set="-mode hex"/>
    </select>
   </vgroup>
  </hgroup>
  <_description>
Draws the scrolling 3D green characters from the movie "The Matrix".
Written by Jamie Zawinski; 2003.
  </_description>
</screensaver>`

func TestParseXMLReaderAndBuildArgs(t *testing.T) {
	saver, err := ParseXMLReader(strings.NewReader(sampleGLMatrixXML), "/usr/lib/xscreensaver/glmatrix")
	if err != nil {
		t.Fatalf("expected no error parsing XML, got: %v", err)
	}
	if saver.ID != "xss_glmatrix" {
		t.Errorf("expected ID xss_glmatrix, got %s", saver.ID)
	}
	if saver.Name != "GLMatrix" {
		t.Errorf("expected Name GLMatrix, got %s", saver.Name)
	}
	if saver.Category != "XScreenSaver OpenGL" {
		t.Errorf("expected Category XScreenSaver OpenGL, got %s", saver.Category)
	}
	if len(saver.Params) != 7 {
		t.Fatalf("expected 7 parameters, got %d", len(saver.Params))
	}

	args := BuildCommandArgs(*saver, map[string]any{
		"delay":   float64(80000), // inverted -> 20000
		"speed":   float64(2.5),
		"density": float64(45),
		"fog":     false,
		"waves":   true,
		"mode":    "dna",
	})

	joined := strings.Join(args, " ")
	expectedSubstrings := []string{
		"-root",
		"-delay 20000",
		"-speed 2.5",
		"-density 45",
		"-no-fog",
		"-mode dna",
	}
	for _, sub := range expectedSubstrings {
		if !strings.Contains(joined, sub) {
			t.Errorf("expected CLI args %q to contain %q", joined, sub)
		}
	}
}
