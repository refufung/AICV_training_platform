"""GPS → BIM locate endpoint."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database.models import get_db
from backend.auth import get_current_user
from backend.services.location_engine import gps_to_local, find_nearest_component

router = APIRouter(prefix="/locate", tags=["locate"])


@router.get("")
def locate_component(
    lat: float = Query(..., description="GPS latitude"),
    lng: float = Query(..., description="GPS longitude"),
    floor: str | None = Query(None, description="Storey filter, e.g. 1/F"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Convert GPS coordinates to IFC local space and return the nearest
    BIM component.
    """
    ix, iy, iz = gps_to_local(lat, lng)
    nearest = find_nearest_component(db, ix, iy, iz, storey=floor)
    return {
        "ifc_x": round(ix, 2),
        "ifc_y": round(iy, 2),
        "ifc_z": round(iz, 2),
        "component": nearest,
    }
