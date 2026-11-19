from pathlib import Path
import sys

import cairosvg
import verovio

output = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/melolegacy-omr-fixture.pdf")
musicxml = """<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>MeloLegacy OMR Smoke Test</work-title></work>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>1</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>
"""
toolkit = verovio.toolkit()
toolkit.setOptions({"pageWidth": 2100, "pageHeight": 2970, "scale": 100, "adjustPageHeight": True})
if not toolkit.loadData(musicxml):
    raise SystemExit("Verovio could not load the MusicXML fixture.")
svg = toolkit.renderToSVG(1)
if not svg or "<svg" not in svg:
    raise SystemExit("Verovio did not render the MusicXML fixture.")
cairosvg.svg2pdf(bytestring=svg.encode("utf-8"), write_to=str(output))
if not output.is_file() or output.stat().st_size < 1000:
    raise SystemExit("The generated PDF fixture is missing or unexpectedly small.")
print(f"Generated {output} ({output.stat().st_size} bytes)")
