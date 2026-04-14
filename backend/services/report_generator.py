"""
PDF report generator using reportlab.

Produces a multi-page inspection report with summary statistics,
defect table, and per-defect detail pages with photos.
"""
import io
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "backend/uploads"))

SEVERITY_COLORS = {
    "critical": colors.HexColor("#ef4444"),
    "high": colors.HexColor("#f97316"),
    "medium": colors.HexColor("#eab308"),
    "low": colors.HexColor("#22c55e"),
}


def generate_pdf(defects: list, title: str = "Building Inspection Report") -> io.BytesIO:
    """Return a BytesIO containing the rendered PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=15 * mm)
    styles = getSampleStyleSheet()
    story: list = []

    # ── Title page ────────────────────────────────────────────────────────
    story.append(Spacer(1, 40 * mm))
    story.append(Paragraph(title, styles["Title"]))
    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        )
    )
    story.append(Paragraph(f"Total defects: {len(defects)}", styles["Normal"]))
    story.append(PageBreak())

    # ── Summary statistics ────────────────────────────────────────────────
    story.append(Paragraph("Summary", styles["Heading1"]))

    sev_counts = {}
    cls_counts = {}
    floor_counts = {}
    for d in defects:
        sev = d.severity.value
        sev_counts[sev] = sev_counts.get(sev, 0) + 1
        cls = d.defect_class.value
        cls_counts[cls] = cls_counts.get(cls, 0) + 1
        floor_counts[d.floor] = floor_counts.get(d.floor, 0) + 1

    # Severity table
    story.append(Paragraph("By Severity", styles["Heading2"]))
    sev_data = [["Severity", "Count"]]
    for s in ("critical", "high", "medium", "low"):
        sev_data.append([s.capitalize(), str(sev_counts.get(s, 0))])
    t = Table(sev_data, colWidths=[60 * mm, 40 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 6 * mm))

    # Class table
    story.append(Paragraph("By Defect Class", styles["Heading2"]))
    cls_data = [["Class", "Count"]] + [
        [k, str(v)] for k, v in sorted(cls_counts.items(), key=lambda x: -x[1])
    ]
    t2 = Table(cls_data, colWidths=[60 * mm, 40 * mm])
    t2.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(t2)
    story.append(PageBreak())

    # ── Defect list table ─────────────────────────────────────────────────
    story.append(Paragraph("Defect Register", styles["Heading1"]))
    tbl_data = [["#", "Class", "Severity", "Floor", "Component", "Status", "Date"]]
    for d in defects:
        comp_name = d.component.name if d.component else "-"
        created = d.created_at.strftime("%Y-%m-%d") if d.created_at else "-"
        tbl_data.append(
            [
                str(d.id),
                d.defect_class.value,
                d.severity.value,
                d.floor,
                comp_name[:20],
                d.status.value,
                created,
            ]
        )

    col_w = [10 * mm, 28 * mm, 18 * mm, 14 * mm, 40 * mm, 20 * mm, 22 * mm]
    t3 = Table(tbl_data, colWidths=col_w, repeatRows=1)
    t3.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(t3)

    doc.build(story)
    buf.seek(0)
    return buf
