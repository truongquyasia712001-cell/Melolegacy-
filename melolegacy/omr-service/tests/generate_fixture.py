from pathlib import Path
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

output = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/melolegacy-omr-fixture.pdf")
output.parent.mkdir(parents=True, exist_ok=True)
pdf = canvas.Canvas(str(output), pagesize=A4, pageCompression=0)
width, height = A4

pdf.setTitle("MeloLegacy OMR Smoke Test")
pdf.setFont("Helvetica-Bold", 16)
pdf.drawString(32 * mm, height - 32 * mm, "MeloLegacy OMR Smoke Test")
pdf.setFont("Helvetica", 9)
pdf.drawString(32 * mm, height - 40 * mm, "Synthetic one-staff, four-quarter-note recognition fixture")

# Draw a high-contrast five-line staff with conventional 4 mm spacing.
left = 32 * mm
right = width - 24 * mm
bottom = height - 112 * mm
spacing = 4 * mm
pdf.setLineWidth(0.9)
for line in range(5):
    y = bottom + line * spacing
    pdf.line(left, y, right, y)

# Simple treble-clef-like spiral cue centered on the G line; the five staff
# lines and noteheads remain the primary machine-readable geometry.
pdf.setLineWidth(1.5)
pdf.circle(left + 11 * mm, bottom + 2 * spacing, 2.2 * mm, stroke=1, fill=0)
pdf.line(left + 11 * mm, bottom - 2 * mm, left + 11 * mm, bottom + 4 * spacing + 9 * mm)

pdf.setFont("Helvetica", 12)
pdf.drawString(left + 22 * mm, bottom + 2 * spacing - 2 * mm, "4")
pdf.drawString(left + 22 * mm, bottom + spacing - 2 * mm, "4")

# E4, F4, G4, A4 quarter notes with stems, evenly spaced in one 4/4 bar.
note_x = [left + 55 * mm, left + 82 * mm, left + 109 * mm, left + 136 * mm]
note_y = [bottom, bottom + spacing / 2, bottom + spacing, bottom + spacing * 1.5]
pdf.setLineWidth(1.2)
for x, y in zip(note_x, note_y):
    pdf.saveState()
    pdf.translate(x, y)
    pdf.rotate(-18)
    pdf.ellipse(-2.2 * mm, -1.35 * mm, 2.2 * mm, 1.35 * mm, stroke=0, fill=1)
    pdf.restoreState()
    pdf.line(x + 1.8 * mm, y, x + 1.8 * mm, y + 8 * mm)

pdf.line(right, bottom - 1 * mm, right, bottom + 4 * spacing + 1 * mm)
pdf.showPage()
pdf.save()

if not output.is_file() or output.stat().st_size < 1000:
    raise SystemExit("The generated PDF fixture is missing or unexpectedly small.")
print(f"Generated {output} ({output.stat().st_size} bytes)")
