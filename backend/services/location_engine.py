"""
Location Engine — GPS-to-BIM coordinate transform and nearest-component lookup.

Uses a cached scipy KD-tree built from BimComponent coordinates for fast
nearest-neighbor queries.  Provides:
  - GPS ↔ local IFC coordinate conversion
  - Nearest BIM component lookup (with optional storey filter)
"""
import threading
from typing import Optional

import numpy as np
from scipy.spatial import KDTree
from sqlalchemy.orm import Session

from backend.database.models import BimComponent

# ── Module-level cache ────────────────────────────────────────────────────
_lock = threading.Lock()
_tree: Optional[KDTree] = None
_components: list[dict] = []


def _load_components(db: Session) -> list[dict]:
    """Load all BIM components from DB as dicts."""
    rows = db.query(BimComponent).all()
    return [
        {
            "id": r.id,
            "global_id": r.global_id,
            "name": r.name,
            "type": r.type,
            "storey": r.storey,
            "x": r.x,
            "y": r.y,
            "z": r.z,
        }
        for r in rows
    ]


def _ensure_tree(db: Session) -> tuple[KDTree, list[dict]]:
    """Build (or return cached) KD-tree from BIM components."""
    global _tree, _components
    with _lock:
        if _tree is None or len(_components) == 0:
            _components = _load_components(db)
            if _components:
                coords = np.array([[c["x"], c["y"], c["z"]] for c in _components])
                _tree = KDTree(coords)
    return _tree, _components


def invalidate_cache():
    """Call after component data changes to force a rebuild."""
    global _tree, _components
    with _lock:
        _tree = None
        _components = []


def find_nearest_component(
    db: Session,
    x: float,
    y: float,
    z: float,
    storey: Optional[str] = None,
    max_distance: float = 50000.0,
) -> Optional[dict]:
    """
    Find the BIM component closest to (x, y, z).

    If *storey* is given, only components on that storey are considered.
    Returns a dict with component info and ``_distance``, or None.
    """
    tree, components = _ensure_tree(db)
    if tree is None or not components:
        return None

    if storey:
        storey_comps = [c for c in components if c["storey"] == storey]
        if not storey_comps:
            return None
        coords = np.array([[c["x"], c["y"], c["z"]] for c in storey_comps])
        dists = np.linalg.norm(coords - np.array([x, y, z]), axis=1)
        best = int(np.argmin(dists))
        if dists[best] > max_distance:
            return None
        return {**storey_comps[best], "_distance": round(float(dists[best]), 4)}

    dist, idx = tree.query([x, y, z])
    if dist > max_distance:
        return None
    return {**components[idx], "_distance": round(float(dist), 4)}


# ── GPS ↔ IFC transform ──────────────────────────────────────────────────
# The IFC coordinates in this project are extremely large (~800 000 000)
# because they use raw projected coordinates (e.g. HK1980 Grid in
# millimetres).  We store a reference GPS point and its corresponding IFC
# coordinate so the engine can do a simple affine offset conversion.
#
# For a real deployment these would come from the IFC georef metadata
# (IfcMapConversion / IfcProjectedCRS).  Here we hard-code a sensible
# default derived from the two sample IFC files in the project.

# Reference point – approximate centre of the sample BIM model
_REF_GPS_LAT = 22.3193      # Hong Kong latitude
_REF_GPS_LNG = 114.1694     # Hong Kong longitude
_REF_IFC_X = 839_017_550.0  # Typical X from components JSON
_REF_IFC_Y = 820_718_393.0  # Typical Y from components JSON
_REF_IFC_Z = 0.0

# Scale: approximate metres-per-degree at Hong Kong latitude, then × 1000
# because IFC coords appear to be in mm.
_M_PER_DEG_LAT = 111_320.0
_M_PER_DEG_LNG = 111_320.0 * np.cos(np.radians(_REF_GPS_LAT))
_SCALE = 1000.0  # mm per metre (IFC units)


def gps_to_local(lat: float, lng: float, z: float = 0.0) -> tuple[float, float, float]:
    """Convert GPS (WGS-84) coords to approximate IFC local coords."""
    dx = (lng - _REF_GPS_LNG) * _M_PER_DEG_LNG * _SCALE
    dy = (lat - _REF_GPS_LAT) * _M_PER_DEG_LAT * _SCALE
    return (_REF_IFC_X + dx, _REF_IFC_Y + dy, _REF_IFC_Z + z)


def local_to_gps(x: float, y: float) -> tuple[float, float]:
    """Convert IFC local coords back to approximate GPS (lat, lng)."""
    lng = _REF_GPS_LNG + (x - _REF_IFC_X) / (_M_PER_DEG_LNG * _SCALE)
    lat = _REF_GPS_LAT + (y - _REF_IFC_Y) / (_M_PER_DEG_LAT * _SCALE)
    return (lat, lng)
