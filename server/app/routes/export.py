"""
app/routes/export.py
====================
Export scan history in CSV, Excel, or PDF format.

GET /api/export/csv   — scan history as CSV
GET /api/export/excel — scan history as Excel (.xlsx)
GET /api/export/pdf   — scan history as PDF
"""
import io
import csv
from flask import Blueprint, make_response, g
from app.models.scan import Scan
from app.utils.auth import jwt_required

export_bp = Blueprint("export", __name__)

def _get_user_scans():
    return (
        Scan.query
        .filter_by(user_id=g.user_id)
        .order_by(Scan.created_at.desc())
        .limit(100)
        .all()
    )

@export_bp.route("/csv", methods=["GET"])
@jwt_required
def export_csv():
    """Export last 100 scan records as CSV."""
    scans = _get_user_scans()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Product", "Barcode", "Category", "Score", "Method"])
    for s in scans:
        writer.writerow([
            s.created_at.strftime("%Y-%m-%d %H:%M"),
            s.product_name or "",
            s.barcode or "",
            s.category or "",
            s.base_score or "",
            s.input_method or "",
        ])
    response = make_response(output.getvalue())
    response.headers["Content-Type"]        = "text/csv"
    response.headers["Content-Disposition"] = "attachment; filename=label_padhega_scans.csv"
    return response

@export_bp.route("/excel", methods=["GET"])
@jwt_required
def export_excel():
    """Export last 100 scan records as Excel (.xlsx)."""
    from openpyxl import Workbook
    scans = _get_user_scans()
    wb = Workbook()
    ws = wb.active
    ws.title = "My Scans"
    ws.append(["Date", "Product", "Barcode", "Category", "Score", "Method"])
    for s in scans:
        ws.append([
            s.created_at.strftime("%Y-%m-%d %H:%M"),
            s.product_name or "",
            s.barcode or "",
            s.category or "",
            s.base_score or "",
            s.input_method or "",
        ])
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    response = make_response(output.read())
    response.headers["Content-Type"]        = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    response.headers["Content-Disposition"] = "attachment; filename=label_padhega_scans.xlsx"
    return response

@export_bp.route("/pdf", methods=["GET"])
@jwt_required
def export_pdf():
    """Export last 100 scan records as PDF."""
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    scans = _get_user_scans()
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [Paragraph("Label Padhega AI — Scan History", styles["Title"])]

    table_data = [["Date", "Product", "Score", "Category"]]
    for s in scans:
        table_data.append([
            s.created_at.strftime("%Y-%m-%d"),
            (s.product_name or "")[:40],
            str(s.base_score or ""),
            s.category or "",
        ])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16a34a")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTSIZE",   (0, 0), (-1, 0), 11),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdf4")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
    ]))
    elements.append(table)
    doc.build(elements)
    output.seek(0)
    response = make_response(output.read())
    response.headers["Content-Type"]        = "application/pdf"
    response.headers["Content-Disposition"] = "attachment; filename=label_padhega_scans.pdf"
    return response
