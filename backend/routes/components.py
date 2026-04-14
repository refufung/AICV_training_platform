"""BIM Component routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database.models import BimComponent, Defect, get_db
from backend.auth import get_current_user
from backend.schemas import ComponentResponse, DefectResponse

router = APIRouter(prefix="/components", tags=["components"])


@router.get("", response_model=list[ComponentResponse])
def list_components(
    type: str | None = Query(None),
    storey: str | None = Query(None),
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(BimComponent)
    if type:
        q = q.filter(BimComponent.type == type)
    if storey:
        q = q.filter(BimComponent.storey == storey)
    components = q.offset(skip).limit(limit).all()

    result = []
    for c in components:
        defect_count = db.query(func.count(Defect.id)).filter(Defect.component_id == c.id).scalar()
        resp = ComponentResponse(
            id=c.id,
            global_id=c.global_id,
            name=c.name,
            type=c.type,
            storey=c.storey,
            x=c.x,
            y=c.y,
            z=c.z,
            bbox_min_x=c.bbox_min_x,
            bbox_min_y=c.bbox_min_y,
            bbox_min_z=c.bbox_min_z,
            bbox_max_x=c.bbox_max_x,
            bbox_max_y=c.bbox_max_y,
            bbox_max_z=c.bbox_max_z,
            defect_count=defect_count or 0,
        )
        result.append(resp)
    return result


@router.get("/{component_id}", response_model=ComponentResponse)
def get_component(component_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(BimComponent).filter(BimComponent.id == component_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Component not found")
    defect_count = db.query(func.count(Defect.id)).filter(Defect.component_id == c.id).scalar()
    return ComponentResponse(
        id=c.id,
        global_id=c.global_id,
        name=c.name,
        type=c.type,
        storey=c.storey,
        x=c.x,
        y=c.y,
        z=c.z,
        bbox_min_x=c.bbox_min_x,
        bbox_min_y=c.bbox_min_y,
        bbox_min_z=c.bbox_min_z,
        bbox_max_x=c.bbox_max_x,
        bbox_max_y=c.bbox_max_y,
        bbox_max_z=c.bbox_max_z,
        defect_count=defect_count or 0,
    )


@router.get("/{component_id}/defects")
def get_component_defects(
    component_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    c = db.query(BimComponent).filter(BimComponent.id == component_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Component not found")
    defects = db.query(Defect).filter(Defect.component_id == component_id).all()

    from backend.routes.defects import _defect_to_response
    return [_defect_to_response(d) for d in defects]


@router.get("/nearest/")
def nearest_component(
    x: float = Query(...),
    y: float = Query(...),
    z: float = Query(...),
    storey: str | None = Query(None),
    max_distance: float = Query(10.0),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Find the nearest BIM component to given (x, y, z) coordinates."""
    q = db.query(BimComponent)
    if storey:
        q = q.filter(BimComponent.storey == storey)

    # Euclidean distance using SQL expression
    dist_expr = func.sqrt(
        (BimComponent.x - x) * (BimComponent.x - x)
        + (BimComponent.y - y) * (BimComponent.y - y)
        + (BimComponent.z - z) * (BimComponent.z - z)
    )
    result = q.order_by(dist_expr).first()

    if not result:
        raise HTTPException(status_code=404, detail="No components found")

    import math
    dist = math.sqrt((result.x - x) ** 2 + (result.y - y) ** 2 + (result.z - z) ** 2)
    if dist > max_distance:
        raise HTTPException(status_code=404, detail=f"Nearest component is {dist:.2f} away (max: {max_distance})")

    defect_count = db.query(func.count(Defect.id)).filter(Defect.component_id == result.id).scalar()
    return {
        "component": ComponentResponse(
            id=result.id,
            global_id=result.global_id,
            name=result.name,
            type=result.type,
            storey=result.storey,
            x=result.x,
            y=result.y,
            z=result.z,
            bbox_min_x=result.bbox_min_x,
            bbox_min_y=result.bbox_min_y,
            bbox_min_z=result.bbox_min_z,
            bbox_max_x=result.bbox_max_x,
            bbox_max_y=result.bbox_max_y,
            bbox_max_z=result.bbox_max_z,
            defect_count=defect_count or 0,
        ),
        "distance": round(dist, 4),
    }
