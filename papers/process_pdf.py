from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

# Step 1: Create a watermark PDF with "程明飞"
watermark_path = "watermark.pdf"
c = canvas.Canvas(watermark_path, pagesize=letter)
width, height = letter
c.setFont("Helvetica", 48)
c.setFillColorRGB(0.5, 0.5, 0.5, alpha=0.3)  # Semi-transparent gray
c.drawCentredString(width / 2, height / 2, "程明飞")
c.save()

# Step 2: Add watermark and rotate pages
input_pdf = "httparxiv.orgabs2510.27671v1.pdf"
output_pdf = "watermarked_rotated.pdf"

reader = PdfReader(input_pdf)
writer = PdfWriter()
watermark = PdfReader(watermark_path).pages[0]

for page in reader.pages:
    # Merge watermark
    page.merge_page(watermark)
    # Rotate 90 degrees clockwise
    page.rotate(90)
    writer.add_page(page)

# Save the result
with open(output_pdf, "wb") as output_file:
    writer.write(output_file)

print(f"Processed PDF saved to {output_pdf}")
