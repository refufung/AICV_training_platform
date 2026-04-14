"""BCF Topic API routes — create, list, update, comment, import/export."""
import json
import uuid
import zipfile
import io
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from backend.database.models import BcfTopic, BcfComment, get_db
from backend.schemas import (
    BcfTopicCreate, BcfTopicResponse, BcfTopicUpdate,
    BcfCommentCreate, BcfCommentResponse,
)

router = APIRouter(prefix="/bcf", tags=["BCF"])


@router.post("/topics", response_model=BcfTopicResponse)
def create_topic(body: BcfTopicCreate, db: Session = Depends(get_db)):
    topic = BcfTopic(
        guid=str(uuid.uuid4()),
        title=body.title,
        description=body.description,
        topic_type=body.topic_type,
        priority=body.priority,
        status=body.status,
        assigned_to=body.assigned_to,
        due_date=body.due_date,
        viewpoint=body.viewpoint,
        ifc_guids=body.ifc_guids,
        defect_id=body.defect_id,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.get("/topics", response_model=list[BcfTopicResponse])
def list_topics(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(BcfTopic).options(joinedload(BcfTopic.comments))
    if status:
        q = q.filter(BcfTopic.status == status)
    return q.order_by(BcfTopic.created_at.desc()).all()


@router.get("/topics/{topic_id}", response_model=BcfTopicResponse)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(BcfTopic).options(joinedload(BcfTopic.comments)).get(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.patch("/topics/{topic_id}", response_model=BcfTopicResponse)
def update_topic(topic_id: int, body: BcfTopicUpdate, db: Session = Depends(get_db)):
    topic = db.query(BcfTopic).get(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(BcfTopic).get(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(topic)
    db.commit()
    return {"ok": True}


@router.post("/topics/{topic_id}/comments", response_model=BcfCommentResponse)
def add_comment(topic_id: int, body: BcfCommentCreate, db: Session = Depends(get_db)):
    topic = db.query(BcfTopic).get(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    comment = BcfComment(
        guid=str(uuid.uuid4()),
        topic_id=topic_id,
        text=body.text,
        author=body.author,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/export")
def export_bcf(db: Session = Depends(get_db)):
    """Export all topics as a BCF 2.1 zip file."""
    topics = db.query(BcfTopic).options(joinedload(BcfTopic.comments)).all()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("bcf.version", '<?xml version="1.0" encoding="UTF-8"?>\n<Version VersionId="2.1" />')

        for topic in topics:
            prefix = topic.guid

            # markup.bcf
            markup = ET.Element("Markup")
            t = ET.SubElement(markup, "Topic", Guid=topic.guid, TopicType=topic.topic_type or "Issue")
            ET.SubElement(t, "Title").text = topic.title
            if topic.description:
                ET.SubElement(t, "Description").text = topic.description
            ET.SubElement(t, "Priority").text = topic.priority or "Normal"
            ET.SubElement(t, "TopicStatus").text = topic.status or "Open"
            if topic.assigned_to:
                ET.SubElement(t, "AssignedTo").text = topic.assigned_to
            if topic.created_at:
                ET.SubElement(t, "CreationDate").text = topic.created_at.isoformat()

            for c in topic.comments or []:
                ce = ET.SubElement(markup, "Comment", Guid=c.guid)
                ET.SubElement(ce, "Comment").text = c.text
                if c.author:
                    ET.SubElement(ce, "Author").text = c.author
                if c.created_at:
                    ET.SubElement(ce, "Date").text = c.created_at.isoformat()

            markup_str = ET.tostring(markup, encoding="unicode", xml_declaration=True)
            zf.writestr(f"{prefix}/markup.bcf", markup_str)

            # viewpoint.bcfv
            if topic.viewpoint:
                try:
                    vp = json.loads(topic.viewpoint)
                    vis = ET.Element("VisualizationInfo", Guid=str(uuid.uuid4()))
                    if "camera" in vp:
                        cam = vp["camera"]
                        pe = ET.SubElement(vis, "PerspectiveCamera")
                        cp = ET.SubElement(pe, "CameraViewPoint")
                        ET.SubElement(cp, "X").text = str(cam["position"][0])
                        ET.SubElement(cp, "Y").text = str(cam["position"][1])
                        ET.SubElement(cp, "Z").text = str(cam["position"][2])
                        cd = ET.SubElement(pe, "CameraDirection")
                        dx = cam["target"][0] - cam["position"][0]
                        dy = cam["target"][1] - cam["position"][1]
                        dz = cam["target"][2] - cam["position"][2]
                        ET.SubElement(cd, "X").text = str(dx)
                        ET.SubElement(cd, "Y").text = str(dy)
                        ET.SubElement(cd, "Z").text = str(dz)
                    vp_str = ET.tostring(vis, encoding="unicode", xml_declaration=True)
                    zf.writestr(f"{prefix}/viewpoint.bcfv", vp_str)
                except (json.JSONDecodeError, KeyError):
                    pass

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="topics.bcf"'},
    )


@router.post("/import")
def import_bcf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import topics from a BCF zip file."""
    content = file.file.read()
    buf = io.BytesIO(content)

    imported = 0
    try:
        with zipfile.ZipFile(buf, "r") as zf:
            markup_files = [n for n in zf.namelist() if n.endswith("markup.bcf")]

            for mf in markup_files:
                try:
                    xml_data = zf.read(mf)
                    root = ET.fromstring(xml_data)
                    topic_el = root.find("Topic")
                    if topic_el is None:
                        continue

                    guid = topic_el.get("Guid", str(uuid.uuid4()))
                    title = topic_el.findtext("Title", "Imported Topic")
                    desc = topic_el.findtext("Description")
                    priority = (topic_el.findtext("Priority") or "normal").lower()
                    status = (topic_el.findtext("TopicStatus") or "open").lower().replace(" ", "_")
                    assigned = topic_el.findtext("AssignedTo")

                    existing = db.query(BcfTopic).filter(BcfTopic.guid == guid).first()
                    if existing:
                        existing.title = title
                        existing.description = desc
                        existing.priority = priority
                        existing.status = status
                        if assigned:
                            existing.assigned_to = assigned
                        topic_obj = existing
                    else:
                        topic_obj = BcfTopic(
                            guid=guid,
                            title=title,
                            description=desc,
                            topic_type=(topic_el.get("TopicType") or "issue").lower(),
                            priority=priority,
                            status=status,
                            assigned_to=assigned,
                        )
                        db.add(topic_obj)
                        db.flush()

                    # Parse comments
                    for comment_el in root.findall("Comment"):
                        c_guid = comment_el.get("Guid", str(uuid.uuid4()))
                        c_text = comment_el.findtext("Comment", "")
                        c_author = comment_el.findtext("Author")
                        existing_c = db.query(BcfComment).filter(BcfComment.guid == c_guid).first()
                        if not existing_c and c_text:
                            db.add(BcfComment(
                                guid=c_guid,
                                topic_id=topic_obj.id,
                                text=c_text,
                                author=c_author,
                            ))

                    # Parse viewpoint
                    dir_prefix = mf.rsplit("/", 1)[0] if "/" in mf else ""
                    vp_path = f"{dir_prefix}/viewpoint.bcfv" if dir_prefix else "viewpoint.bcfv"
                    if vp_path in zf.namelist():
                        try:
                            vp_xml = zf.read(vp_path)
                            vp_root = ET.fromstring(vp_xml)
                            cam_el = vp_root.find(".//PerspectiveCamera")
                            if cam_el is not None:
                                px = float(cam_el.findtext("CameraViewPoint/X", "0"))
                                py = float(cam_el.findtext("CameraViewPoint/Y", "0"))
                                pz = float(cam_el.findtext("CameraViewPoint/Z", "0"))
                                dx = float(cam_el.findtext("CameraDirection/X", "0"))
                                dy = float(cam_el.findtext("CameraDirection/Y", "0"))
                                dz = float(cam_el.findtext("CameraDirection/Z", "0"))
                                vp_data = {
                                    "camera": {
                                        "position": [px, py, pz],
                                        "target": [px + dx, py + dy, pz + dz],
                                    },
                                    "clippingPlanes": [],
                                    "hiddenElements": [],
                                }
                                topic_obj.viewpoint = json.dumps(vp_data)
                        except (ET.ParseError, ValueError):
                            pass

                    imported += 1
                except ET.ParseError:
                    continue

            db.commit()
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid BCF zip file")

    return {"imported": imported}
