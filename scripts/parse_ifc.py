"""
Parse IFC files and extract building component information.

Usage:
    python scripts/parse_ifc.py <ifc_file_path> [--output components.json]

Extracts:
- GlobalId, Name, Type (IfcWall, IfcColumn, IfcSlab, etc.)
- Storey / floor
- Placement coordinates (x, y, z)
- Bounding box (if geometry available)
"""
import json
import sys
import argparse
from pathlib import Path

try:
    import ifcopenshell
    import ifcopenshell.geom
    import ifcopenshell.util.placement
except ImportError:
    print("ERROR: ifcopenshell not installed. Run: pip install ifcopenshell")
    sys.exit(1)

# IFC types we care about for building inspection
TARGET_TYPES = [
    "IfcWall",
    "IfcWallStandardCase",
    "IfcColumn",
    "IfcBeam",
    "IfcSlab",
    "IfcRoof",
    "IfcStair",
    "IfcStairFlight",
    "IfcRailing",
    "IfcWindow",
    "IfcDoor",
    "IfcCurtainWall",
    "IfcPlate",
    "IfcMember",
    "IfcFooting",
    "IfcPile",
    "IfcCovering",
    "IfcBuildingElementProxy",
]


def get_storey(element) -> str:
    """Walk up containment hierarchy to find the storey name."""
    for rel in getattr(element, "ContainedInStructure", []):
        structure = rel.RelatingStructure
        if structure.is_a("IfcBuildingStorey"):
            return structure.Name or "Unknown"
    # Try decomposes
    for rel in getattr(element, "Decomposes", []):
        parent = rel.RelatingObject
        if parent.is_a("IfcBuildingStorey"):
            return parent.Name or "Unknown"
        # recurse one level
        for rel2 in getattr(parent, "ContainedInStructure", []):
            structure = rel2.RelatingStructure
            if structure.is_a("IfcBuildingStorey"):
                return structure.Name or "Unknown"
    return "Unknown"


def get_placement_coords(element) -> tuple:
    """Extract placement coordinates from ObjectPlacement."""
    try:
        matrix = ifcopenshell.util.placement.get_local_placement(element.ObjectPlacement)
        return float(matrix[0][3]), float(matrix[1][3]), float(matrix[2][3])
    except Exception:
        return 0.0, 0.0, 0.0


def get_bounding_box(element, settings=None) -> dict | None:
    """Attempt to compute bounding box from geometry."""
    if settings is None:
        return None
    try:
        shape = ifcopenshell.geom.create_shape(settings, element)
        verts = shape.geometry.verts
        if not verts:
            return None
        xs = verts[0::3]
        ys = verts[1::3]
        zs = verts[2::3]
        return {
            "min_x": min(xs), "min_y": min(ys), "min_z": min(zs),
            "max_x": max(xs), "max_y": max(ys), "max_z": max(zs),
        }
    except Exception:
        return None


def parse_ifc(file_path: str, compute_bbox: bool = False) -> list[dict]:
    """Parse an IFC file and return list of component dicts."""
    print(f"Opening IFC file: {file_path}")
    model = ifcopenshell.open(file_path)
    print(f"  Schema: {model.schema}")

    settings = None
    if compute_bbox:
        try:
            settings = ifcopenshell.geom.settings()
            settings.set(settings.USE_WORLD_COORDS, True)
        except Exception:
            print("  Warning: could not initialize geometry settings; skipping bbox")
            settings = None

    components = []
    for ifc_type in TARGET_TYPES:
        elements = model.by_type(ifc_type)
        for el in elements:
            x, y, z = get_placement_coords(el)
            storey = get_storey(el)
            bbox = get_bounding_box(el, settings) if compute_bbox else None

            comp = {
                "global_id": el.GlobalId,
                "name": el.Name or f"{ifc_type}_{el.id()}",
                "type": el.is_a(),
                "storey": storey,
                "x": round(x, 4),
                "y": round(y, 4),
                "z": round(z, 4),
            }
            if bbox:
                comp["bbox_min_x"] = round(bbox["min_x"], 4)
                comp["bbox_min_y"] = round(bbox["min_y"], 4)
                comp["bbox_min_z"] = round(bbox["min_z"], 4)
                comp["bbox_max_x"] = round(bbox["max_x"], 4)
                comp["bbox_max_y"] = round(bbox["max_y"], 4)
                comp["bbox_max_z"] = round(bbox["max_z"], 4)

            components.append(comp)

    print(f"  Found {len(components)} components across {len(set(c['type'] for c in components))} types")

    # Summary by type
    from collections import Counter
    type_counts = Counter(c["type"] for c in components)
    for t, n in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"    {t}: {n}")

    return components


def main():
    parser = argparse.ArgumentParser(description="Parse IFC files to extract building components")
    parser.add_argument("ifc_file", help="Path to the .ifc file")
    parser.add_argument("--output", "-o", default=None, help="Output JSON file (default: <ifc_name>_components.json)")
    parser.add_argument("--bbox", action="store_true", help="Attempt to compute bounding boxes (slower)")
    args = parser.parse_args()

    ifc_path = Path(args.ifc_file)
    if not ifc_path.exists():
        print(f"ERROR: File not found: {ifc_path}")
        sys.exit(1)

    out_path = args.output or str(ifc_path.stem + "_components.json")

    components = parse_ifc(str(ifc_path), compute_bbox=args.bbox)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(components, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Saved {len(components)} components to {out_path}")


if __name__ == "__main__":
    main()
