"""Defect CRUD routes."""
import os
import uuid
from pathlib import Path
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database.models import (
    Defect, BimComponent, DefectClassEnum, SeverityEnum, DefectStatusEnum,
    Notification, get_db,
)
from backend.auth import get_current_user
from backend.schemas import DefectResponse, DefectUpdate, DefectStats
from backend.services.location_engine import find_nearest_component, gps_to_local
from backend.services.notifications import notify_defect_created

router = APIRouter(prefix="/defects", tags=["defects"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "backend/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _defect_to_response(d: Defect, base_url: str = "/api") -> DefectResponse:
    return DefectResponse(
        id=d.id,
        photo_url=f"{base_url}/uploads/{Path(d.photo_path).name}",
        defect_class=d.defect_class.value,
        confidence=d.confidence,
        bbox={"x": d.bbox_x, "y": d.bbox_y, "w": d.bbox_w, "h": d.bbox_h},
        gps_lat=d.gps_lat,
        gps_lng=d.gps_lng,
        floor=d.floor,
        component_id=d.component_id,
        component_name=d.component.name if d.component else None,
        component_type=d.component.type if d.component else None,
        severity=d.severity.value,
        status=d.status.value,
        notes=d.notes,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@router.get("", response_model=list[DefectResponse])
def list_defects(
    defect_class: str | None = Query(None),
    severity: str | None = Query(None),
    status: str | None = Query(None),
    floor: str | None = Query(None),
    component_id: int | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Defect)
    if defect_class:
        q = q.filter(Defect.defect_class == defect_class)
    if severity:
        q = q.filter(Defect.severity == severity)
    if status:
        q = q.filter(Defect.status == status)
    if floor:
        q = q.filter(Defect.floor == floor)
    if component_id:
        q = q.filter(Defect.component_id == component_id)
    defects = q.order_by(Defect.created_at.desc()).offset(skip).limit(limit).all()
    return [_defect_to_response(d) for d in defects]


@router.get("/stats", response_model=DefectStats)
def defect_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    all_defects = db.query(Defect).all()
    total = len(all_defects)

    by_status = Counter(d.status.value for d in all_defects)
    by_severity = Counter(d.severity.value for d in all_defects)
    by_class = Counter(d.defect_class.value for d in all_defects)
    by_floor = Counter(d.floor for d in all_defects)

    recent = sorted(all_defects, key=lambda d: d.created_at or d.id, reverse=True)[:10]

    return DefectStats(
        total=total,
        by_status=dict(by_status),
        by_severity=dict(by_severity),
        by_class=dict(by_class),
        by_floor=dict(by_floor),
        recent=[_defect_to_response(d) for d in recent],
    )


@router.get("/{defect_id}", response_model=DefectResponse)
def get_defect(defect_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = db.query(Defect).filter(Defect.id == defect_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    return _defect_to_response(d)


@router.post("", response_model=DefectResponse, status_code=201)
async def create_defect(
    photo: UploadFile = File(...),
    defect_class: str = Form(...),
    confidence: float = Form(0.0),
    bbox: str = Form("0,0,0,0"),
    floor: str = Form("1F"),
    gps_lat: float | None = Form(None),
    gps_lng: float | None = Form(None),
    severity: str = Form("medium"),
    notes: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Validate defect class
    try:
        dc = DefectClassEnum(defect_class)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid defect class: {defect_class}")

    # Validate severity
    try:
        sev = SeverityEnum(severity)
    except ValueError:
        sev = SeverityEnum.medium

    # Save photo
    ext = Path(photo.filename or "photo.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / filename

    content = await photo.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Parse bbox
    parts = bbox.split(",")
    bx, by, bw, bh = (float(parts[i]) if i < len(parts) else 0.0 for i in range(4))

    defect = Defect(
        photo_path=str(file_path),
        defect_class=dc,
        confidence=confidence,
        bbox_x=bx,
        bbox_y=by,
        bbox_w=bw,
        bbox_h=bh,
        gps_lat=gps_lat,
        gps_lng=gps_lng,
        floor=floor,
        severity=sev,
        notes=notes,
        inspector_id=current_user.id,
    )

    # Auto-link to nearest BIM component via GPS → IFC transform
    if gps_lat is not None and gps_lng is not None:
        try:
            ix, iy, iz = gps_to_local(gps_lat, gps_lng)
            nearest = find_nearest_component(db, ix, iy, iz, storey=floor)
            if nearest:
                defect.component_id = nearest["id"]
        except Exception:
            pass  # non-critical — skip auto-link on error

    db.add(defect)
    db.commit()
    db.refresh(defect)

    # Fire notifications (email / webhook / in-app) for high+ severity
    try:
        notify_defect_created(db, defect)
    except Exception:
        pass  # non-critical

    return _defect_to_response(defect)


@router.patch("/{defect_id}", response_model=DefectResponse)
def update_defect(
    defect_id: int,
    data: DefectUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    d = db.query(Defect).filter(Defect.id == defect_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    if data.severity is not None:
        try:
            d.severity = SeverityEnum(data.severity)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid severity: {data.severity}")
    if data.status is not None:
        try:
            d.status = DefectStatusEnum(data.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
    if data.notes is not None:
        d.notes = data.notes
    if data.component_id is not None:
        d.component_id = data.component_id

    db.commit()
    db.refresh(d)
    return _defect_to_response(d)
