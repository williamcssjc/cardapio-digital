from __future__ import annotations

import base64
import re
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A6
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
QR_DIR = ROOT / "public" / "qrcodes"
LOGO_PATH = ROOT / "public" / "images" / "bem-vindo-parrilla_files" / "329675443_166525619460264_7701584471472344116_n.jpg"
OUTPUT_DIR = ROOT / "output" / "placas-mesas"
SVG_DIR = OUTPUT_DIR / "svg"
PNG_DIR = OUTPUT_DIR / "png"
PDF_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"

PAGE_WIDTH_PX = 1240
PAGE_HEIGHT_PX = 1748
SVG_WIDTH_MM = 105
SVG_HEIGHT_MM = 148
MM_TO_PX = PAGE_WIDTH_PX / SVG_WIDTH_MM
GOLD = "#C89A4B"
GOLD_SOFT = "#D8BD88"
WINE = "#6B2638"
PETROL = "#071A1D"
CREAM = "#EEE7D9"
MUTED = "#B8ADA0"
INK = "#17120B"

GEORGIA = Path("C:/Windows/Fonts/georgia.ttf")
GEORGIA_ITALIC = Path("C:/Windows/Fonts/georgiai.ttf")
ARIAL = Path("C:/Windows/Fonts/arial.ttf")
ARIAL_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")


def mm(value: float) -> int:
    return round(value * MM_TO_PX)


def load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def crop_logo() -> Image.Image:
    logo = Image.open(LOGO_PATH).convert("RGB")
    logo.thumbnail((mm(28), mm(34)), Image.Resampling.LANCZOS)
    return logo


def parse_qr_segments(path: Path) -> tuple[int, list[tuple[float, float, float]]]:
    root = ElementTree.parse(path).getroot()
    view_box = root.attrib["viewBox"].split()
    size = int(float(view_box[2]))
    black_path = next(
        element
        for element in root
        if element.tag.endswith("path") and element.attrib.get("stroke") == "#000000"
    )
    tokens = re.findall(r"[Mmh]|-?\d+(?:\.\d+)?", black_path.attrib["d"])
    segments: list[tuple[float, float, float]] = []
    x = y = 0.0
    index = 0
    while index < len(tokens):
        command = tokens[index]
        index += 1
        if command == "M":
            x = float(tokens[index])
            y = float(tokens[index + 1])
            index += 2
        elif command == "m":
            x += float(tokens[index])
            y += float(tokens[index + 1])
            index += 2
        elif command == "h":
            length = float(tokens[index])
            segments.append((x, y, length))
            x += length
            index += 1
        else:
            raise ValueError(f"Comando SVG inesperado no QR Code: {command}")
    return size, segments


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, font: ImageFont.FreeTypeFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=font)
    x = (PAGE_WIDTH_PX - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=font, fill=fill)


def render_png(table_number: int, logo: Image.Image, qr_size: int, segments: list[tuple[float, float, float]]) -> Path:
    image = Image.new("RGB", (PAGE_WIDTH_PX, PAGE_HEIGHT_PX), PETROL)
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        (mm(4), mm(4), PAGE_WIDTH_PX - mm(4), PAGE_HEIGHT_PX - mm(4)),
        radius=mm(1.2),
        outline=GOLD,
        width=max(2, mm(0.22)),
    )
    draw.line((mm(11), mm(8), PAGE_WIDTH_PX - mm(11), mm(8)), fill=WINE, width=mm(0.8))

    logo_x = (PAGE_WIDTH_PX - logo.width) // 2
    image.paste(logo, (logo_x, mm(10)))

    draw_centered(draw, "Bem-vindo.", mm(42), load_font(GEORGIA_ITALIC, mm(7.4)), CREAM)
    draw_centered(draw, "Seu lugar já está preparado.", mm(52), load_font(ARIAL, mm(2.7)), MUTED)

    qr_box = mm(66)
    qr_x = (PAGE_WIDTH_PX - qr_box) // 2
    qr_y = mm(62)
    draw.rounded_rectangle(
        (qr_x - mm(2.2), qr_y - mm(2.2), qr_x + qr_box + mm(2.2), qr_y + qr_box + mm(2.2)),
        radius=mm(1.4),
        fill="#FFFFFF",
    )
    module = qr_box / qr_size
    for x, y, length in segments:
        x0 = qr_x + round(x * module)
        y0 = qr_y + round((y - 0.5) * module)
        x1 = qr_x + round((x + length) * module)
        y1 = qr_y + round((y + 0.5) * module)
        draw.rectangle((x0, y0, x1, y1), fill="#000000")

    draw_centered(draw, "Escaneie para iniciar sua experiência.", mm(131.5), load_font(ARIAL, mm(2.45)), MUTED)
    draw.line((mm(32), mm(135), PAGE_WIDTH_PX - mm(32), mm(135)), fill=GOLD, width=max(2, mm(0.18)))
    draw_centered(draw, f"Mesa {table_number:02d}", mm(136.5), load_font(GEORGIA, mm(5.3)), GOLD_SOFT)

    output = PNG_DIR / f"mesa-{table_number:02d}.png"
    image.save(output, format="PNG", dpi=(300, 300), optimize=True)
    return output


def render_svg(table_number: int, logo: Image.Image, qr_svg_path: Path) -> Path:
    logo_buffer = BytesIO()
    logo.save(logo_buffer, format="PNG", optimize=True)
    logo_data = base64.b64encode(logo_buffer.getvalue()).decode("ascii")
    qr_root = ElementTree.parse(qr_svg_path).getroot()
    qr_markup = "".join(ElementTree.tostring(child, encoding="unicode") for child in qr_root)

    logo_width_mm = logo.width / MM_TO_PX
    logo_height_mm = logo.height / MM_TO_PX
    logo_x = (SVG_WIDTH_MM - logo_width_mm) / 2

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 105 148">
  <rect width="105" height="148" fill="{PETROL}"/>
  <rect x="4" y="4" width="97" height="140" rx="1.2" fill="none" stroke="{GOLD}" stroke-width="0.22"/>
  <rect x="11" y="7.6" width="83" height="0.8" fill="{WINE}"/>
  <image x="{logo_x:.3f}" y="10" width="{logo_width_mm:.3f}" height="{logo_height_mm:.3f}" href="data:image/png;base64,{logo_data}"/>
  <text x="52.5" y="48" text-anchor="middle" fill="{CREAM}" font-family="Georgia, serif" font-size="7.4" font-style="italic">Bem-vindo.</text>
  <text x="52.5" y="55" text-anchor="middle" fill="{MUTED}" font-family="Arial, sans-serif" font-size="2.7" letter-spacing="0.12">Seu lugar já está preparado.</text>
  <rect x="17.3" y="59.8" width="70.4" height="70.4" rx="1.4" fill="#FFFFFF"/>
  <svg x="19.5" y="62" width="66" height="66" viewBox="0 0 45 45">{qr_markup}</svg>
  <text x="52.5" y="134" text-anchor="middle" fill="{MUTED}" font-family="Arial, sans-serif" font-size="2.45" letter-spacing="0.08">Escaneie para iniciar sua experiência.</text>
  <line x1="32" y1="135" x2="73" y2="135" stroke="{GOLD}" stroke-width="0.18"/>
  <text x="52.5" y="142" text-anchor="middle" fill="{GOLD_SOFT}" font-family="Georgia, serif" font-size="5.3">Mesa {table_number:02d}</text>
</svg>'''

    output = SVG_DIR / f"mesa-{table_number:02d}.svg"
    output.write_text(svg, encoding="utf-8")
    return output


def draw_pdf_qr(pdf: canvas.Canvas, qr_size: int, segments: list[tuple[float, float, float]], x: float, y: float, box: float) -> None:
    pdf.setFillColorRGB(1, 1, 1)
    pdf.roundRect(x - 4, y - 4, box + 8, box + 8, 4, stroke=0, fill=1)
    module = box / qr_size
    pdf.setFillColorRGB(0, 0, 0)
    for segment_x, segment_y, length in segments:
        pdf.rect(
            x + segment_x * module,
            y + (qr_size - segment_y - 0.5) * module,
            length * module,
            module,
            stroke=0,
            fill=1,
        )


def render_pdf(logo: Image.Image) -> Path:
    output = PDF_DIR / "placas-mesas-01-a-23-a6.pdf"
    pdfmetrics.registerFont(TTFont("Georgia", str(GEORGIA)))
    pdfmetrics.registerFont(TTFont("GeorgiaItalic", str(GEORGIA_ITALIC)))
    pdfmetrics.registerFont(TTFont("Arial", str(ARIAL)))
    page_width, page_height = A6
    mm_pt = page_width / SVG_WIDTH_MM
    logo_reader = ImageReader(logo)

    pdf = canvas.Canvas(str(output), pagesize=A6, pageCompression=1)
    pdf.setTitle("Placas oficiais das mesas - +54 Parrilla")

    for table_number in range(1, 24):
        qr_size, segments = parse_qr_segments(QR_DIR / f"mesa-{table_number:02d}.svg")
        pdf.setFillColor(PETROL)
        pdf.rect(0, 0, page_width, page_height, stroke=0, fill=1)
        pdf.setStrokeColor(GOLD)
        pdf.setLineWidth(0.22 * mm_pt)
        pdf.roundRect(4 * mm_pt, 4 * mm_pt, 97 * mm_pt, 140 * mm_pt, 1.2 * mm_pt, stroke=1, fill=0)
        pdf.setFillColor(WINE)
        pdf.rect(11 * mm_pt, 139.6 * mm_pt, 83 * mm_pt, 0.8 * mm_pt, stroke=0, fill=1)

        logo_width = 28 * mm_pt
        logo_height = logo_width * logo.height / logo.width
        pdf.drawImage(logo_reader, (page_width - logo_width) / 2, page_height - 10 * mm_pt - logo_height, logo_width, logo_height, mask="auto")

        pdf.setFillColor(CREAM)
        pdf.setFont("GeorgiaItalic", 21)
        pdf.drawCentredString(page_width / 2, page_height - 48 * mm_pt, "Bem-vindo.")
        pdf.setFillColor(MUTED)
        pdf.setFont("Arial", 7.7)
        pdf.drawCentredString(page_width / 2, page_height - 55 * mm_pt, "Seu lugar já está preparado.")

        qr_box = 66 * mm_pt
        qr_x = (page_width - qr_box) / 2
        qr_y = page_height - 128 * mm_pt
        draw_pdf_qr(pdf, qr_size, segments, qr_x, qr_y, qr_box)

        pdf.setFillColor(MUTED)
        pdf.setFont("Arial", 7)
        pdf.drawCentredString(page_width / 2, page_height - 134 * mm_pt, "Escaneie para iniciar sua experiência.")
        pdf.setStrokeColor(GOLD)
        pdf.setLineWidth(0.18 * mm_pt)
        pdf.line(32 * mm_pt, page_height - 135 * mm_pt, 73 * mm_pt, page_height - 135 * mm_pt)
        pdf.setFillColor(GOLD_SOFT)
        pdf.setFont("Georgia", 15)
        pdf.drawCentredString(page_width / 2, page_height - 142 * mm_pt, f"Mesa {table_number:02d}")
        pdf.showPage()

    pdf.save()
    return output


def main() -> None:
    for directory in (SVG_DIR, PNG_DIR, PDF_DIR, TMP_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    logo = crop_logo()
    logo.save(TMP_DIR / "logo-oficial-recorte.png", format="PNG", optimize=True)

    for table_number in range(1, 24):
        qr_path = QR_DIR / f"mesa-{table_number:02d}.svg"
        qr_size, segments = parse_qr_segments(qr_path)
        render_svg(table_number, logo, qr_path)
        render_png(table_number, logo, qr_size, segments)

    pdf_path = render_pdf(logo)
    print(f"23 SVGs: {SVG_DIR}")
    print(f"23 PNGs a 300 DPI: {PNG_DIR}")
    print(f"PDF A6 com 23 páginas: {pdf_path}")


if __name__ == "__main__":
    main()
