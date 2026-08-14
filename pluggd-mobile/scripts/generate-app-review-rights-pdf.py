from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "PLUGGD_Content_Rights_Statement_Build5.pdf"

ORANGE = HexColor("#FF6600")
INK = HexColor("#17120F")
MUTED = HexColor("#645C57")
PAPER = HexColor("#FBF8F4")
LINE = HexColor("#D8CFC7")


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=22 * mm,
        leftMargin=22 * mm,
        topMargin=19 * mm,
        bottomMargin=18 * mm,
        title="PLUGGD Content Rights and Safety Statement - Build 5",
        author="PLUGGD / 9X LTD",
        subject="App Review supporting statement for PLUGGD iOS 1.0.0 (5)",
    )

    styles = getSampleStyleSheet()
    kicker = ParagraphStyle(
        "Kicker",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=ORANGE,
        tracking=1.5,
        spaceAfter=7,
    )
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=23,
        leading=26,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=6,
    )
    meta = ParagraphStyle(
        "Meta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=MUTED,
        spaceAfter=14,
    )
    heading = ParagraphStyle(
        "Heading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=INK,
        spaceBefore=7,
        spaceAfter=3,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.25,
        leading=13.2,
        textColor=INK,
        spaceAfter=5,
    )
    small = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11,
        textColor=MUTED,
    )

    story = [
        Paragraph("PLUGGD / APP REVIEW EVIDENCE", kicker),
        Paragraph("Content Rights and Safety Statement", title),
        Paragraph(
            "PLUGGD iOS 1.0.0 (Build 5) &nbsp;&nbsp;|&nbsp;&nbsp; App Store Connect ID 6765738727 &nbsp;&nbsp;|&nbsp;&nbsp; Prepared 14 August 2026",
            meta,
        ),
        Paragraph("Creator uploads", heading),
        Paragraph(
            "PLUGGD operates a music-discovery and creator-community service. Creators who upload music, artwork, video or other material warrant that they own or control the rights required to publish and monetize it on PLUGGD. The Terms prohibit unauthorized uploads and allow removal, suspension and account action.",
            body,
        ),
        Paragraph("Review media and catalogue boundaries", heading),
        Paragraph(
            "The audio and artwork used in Build 5 review flows and App Store screenshots is controlled by PLUGGD or supplied by creators who authorized its use. Imported third-party catalogue records are metadata only: they receive no playable URL, cannot enter the native player or queue, and are not sold as PLUGGD audio.",
            body,
        ),
        Paragraph("Notting Hill Carnival editorial", heading),
        Paragraph(
            "The Carnival hub is an independent editorial guide. Photographs, stories and sources are recorded in PLUGGD's content-rights register. The app distinguishes PLUGGD editorial from official operational guidance and links to official travel, accessibility and safety sources. It does not claim official-event status, live crowd density or invented operational signals.",
            body,
        ),
        Paragraph("User-generated content and takedown", heading),
        Paragraph(
            "PLUGGD provides in-product reporting, blocking and filtering for user-generated content, plus a published takedown process. Rights holders, users and Apple may contact support@pluggd.fm for rights, safety or moderation matters.",
            body,
        ),
        Spacer(1, 5 * mm),
    ]

    signature_data = [
        [Paragraph("Signed for PLUGGD / 9X LTD", heading), ""],
        [Paragraph("Name", small), Paragraph("Role", small)],
        ["", ""],
        [Paragraph("Signature", small), Paragraph("Date", small)],
        ["", ""],
    ]
    signature = Table(signature_data, colWidths=[76 * mm, 76 * mm], rowHeights=[9 * mm, 5 * mm, 11 * mm, 5 * mm, 11 * mm])
    signature.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 0), (1, 0)),
                ("BACKGROUND", (0, 0), (1, 4), PAPER),
                ("BOX", (0, 0), (1, 4), 0.7, LINE),
                ("INNERGRID", (0, 1), (1, 4), 0.45, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(signature)
    story.append(Spacer(1, 5 * mm))
    story.append(
        Paragraph(
            "Terms: https://www.pluggd.fm/terms &nbsp;&nbsp;|&nbsp;&nbsp; Community Guidelines: https://www.pluggd.fm/community-guidelines<br/>Rights and safety: support@pluggd.fm",
            small,
        )
    )

    def decorate(canvas, _doc):
        width, height = A4
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setFillColor(ORANGE)
        canvas.rect(0, height - 4 * mm, width, 4 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(ORANGE)
        canvas.setLineWidth(1.1)
        canvas.line(22 * mm, 15 * mm, 56 * mm, 15 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawRightString(width - 22 * mm, 14 * mm, "PLUGGD iOS BUILD 5 - APP REVIEW")
        canvas.restoreState()

    doc.build(story, onFirstPage=decorate)


if __name__ == "__main__":
    build()
