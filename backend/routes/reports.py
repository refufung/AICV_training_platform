"""BCF export and report routes."""
import io
import json
import uuid
import zipfile
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database.models import Defect, get_db
from backend.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


def _create_bcf_zip(defects: list[Defect]) -> io.BytesIO:
    """Generate a BCF 2.1 zip file from defect records."""
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # bcf.version
        version_xml = ET.Element("Version", VersionId="2.1")
        ET.SubElement(version_xml, "DetailedVersion").text = "2.1"
        zf.writestr("bcf.version", ET.tostring(version_xml, encoding="unicode", xml_declaration=True))

        # project.bcfp
        project = ET.Element("ProjectExtension")
        proj = ET.SubElement(project, "Project", ProjectId=str(uuid.uuid4()))
        ET.SubElement(proj, "Name").text = "AI Inspection Defects"
        zf.writestr("project.bcfp", ET.tostring(project, encoding="unicode", xml_declaration=True))

        for d in defects:
            topic_guid = str(uuid.uuid4())
            folder = f"{topic_guid}/"

            # markup.bcf
            markup = ET.Element("Markup")
            topic = ET.SubElement(markup, "Topic", Guid=topic_guid, TopicType="Issue")
            ET.SubElement(topic, "Title").text = f"Defect #{d.id}: {d.defect_class.value}"
            ET.SubElement(topic, "Description").text = (
                f"Class: {d.defect_class.value}\n"
                f"Severity: {d.severity.value}\n"
                f"Floor: {d.floor}\n"
                f"Confidence: {d.confidence:.2%}\n"
                + (f"Notes: {d.notes}\n" if d.notes else "")
            )
            ET.SubElement(topic, "Priority").text = d.severity.value
            ET.SubElement(topic, "CreationDate").text = (
                d.created_at.isoformat() if d.created_at
                else datetime.now(timezone.utc).isoformat()
            )
            ET.SubElement(topic, "ModifiedDate").text = (
                d.updated_at.isoformat() if d.updated_at
                else datetime.now(timezone.utc).isoformat()
            )

            # BIM snippet reference (component GlobalId)
            if d.component and d.component.global_id:
                bim_snippet = ET.SubElement(topic, "BimSnippet", SnippetType="identification")
                ET.SubElement(bim_snippet, "Reference").text = d.component.global_id

            zf.writestr(f"{folder}markup.bcf", ET.tostring(markup, encoding="unicode", xml_declaration=True))

            # viewpoint.bcfv (minimal)
            if d.component:
                vis = ET.Element("VisualizationInfo", Guid=str(uuid.uuid4()))
                components_el = ET.SubElement(vis, "Components")
                selection = ET.SubElement(components_el, "Selection")
                comp_el = ET.SubElement(selection, "Component", IfcGuid=d.component.global_id)
                ET.SubElement(comp_el, "OriginatingSystem").text = "AI-Inspection"
                zf.writestr(
                    f"{folder}viewpoint.bcfv",
                    ET.tostring(vis, encoding="unicode", xml_declaration=True),
                )

    buf.seek(0)
    return buf


@router.get("/bcf")
def export_bcf(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Export all defects as a BCF 2.1 zip file."""
    defects = db.query(Defect).order_by(Defect.id).all()
    buf = _create_bcf_zip(defects)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=defects.bcfzip"},
    )


@router.get("/pdf")
def export_pdf(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Generate and download a PDF inspection report."""
    from backend.services.report_generator import generate_pdf

    defects = db.query(Defect).order_by(Defect.id).all()
    buf = generate_pdf(defects)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=inspection_report.pdf"},
    )


@router.get("/csv")
def export_csv(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Export defects as CSV."""
    import csv as _csv

    defects = db.query(Defect).order_by(Defect.id).all()
    output = io.StringIO()
    writer = _csv.writer(output)
    writer.writerow(["id", "class", "severity", "floor", "component", "status", "confidence", "gps_lat", "gps_lng", "created_at"])
    for d in defects:
        comp_name = d.component.name if d.component else ""
        writer.writerow([
            d.id, d.defect_class.value, d.severity.value, d.floor,
            comp_name, d.status.value, f"{d.confidence:.4f}",
            d.gps_lat or "", d.gps_lng or "",
            d.created_at.isoformat() if d.created_at else "",
        ])
    csv_bytes = io.BytesIO(output.getvalue().encode("utf-8"))
    return StreamingResponse(
        csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=defects.csv"},
    )


@router.post("/bcf/import")
async def import_bcf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Import BCF issues and create defects from them."""
    from fastapi import UploadFile as _UF, File as _File

    contents = await file.read()
    buf = io.BytesIO(contents)
    imported = []
    try:
        with zipfile.ZipFile(buf) as zf:
            for name in zf.namelist():
                if not name.endswith("markup.bcf"):
                    continue
                xml_data = zf.read(name)
                root = ET.fromstring(xml_data)
                topic = root.find("Topic")
                if topic is None:
                    continue
                title_el = topic.find("Title")
                desc_el = topic.find("Description")
                priority = topic.find("Priority")
                severity_str = priority.text.lower() if priority is not None and priority.text else "medium"
                if severity_str not in ("low", "medium", "high", "critical"):
                    severity_str = "medium"
                new_d = Defect(
                    photo_url="",
                    defect_class="other",
                    confidence=0.0,
                    bbox="0,0,0,0",
                    floor="unknown",
                    severity=severity_str,
                    status="new",
                    notes=f"[BCF Import] {title_el.text if title_el is not None else ''}\n{desc_el.text if desc_el is not None else ''}",
                )
                db.add(new_d)
                db.flush()
                imported.append(new_d.id)
        db.commit()
    except Exception as exc:
        db.rollback()
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid BCF file: {exc}")
    return {"imported": len(imported), "ids": imported}
