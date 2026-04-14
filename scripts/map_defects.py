"""
Defect-to-BIM component mapping using nearest-neighbor spatial matching.

Given a defect's approximate position (from floor-plan or GPS), find the
nearest BIM component using Euclidean distance.

Usage:
    python scripts/map_defects.py [--db | --json components.json]
"""
import json
import sys
import argparse
from pathlib import Path

import numpy as np

try:
    from scipy.spatial import KDTree
except ImportError:
    print("ERROR: scipy not installed. Run: pip install scipy")
    sys.exit(1)


def build_kdtree(components: list[dict]) -> tuple:
    """Build a KD-tree from component coordinates."""
    coords = np.array([[c["x"], c["y"], c["z"]] for c in components])
    tree = KDTree(coords)
    return tree, coords


def find_nearest_component(
    tree: "KDTree",
    components: list[dict],
    x: float,
    y: float,
    z: float,
    storey: str | None = None,
    max_distance: float = 10.0,
) -> dict | None:
    """Find the nearest BIM component to the given point."""
    dist, idx = tree.query([x, y, z])
    if dist > max_distance:
        return None

    comp = components[idx]
    if storey and comp.get("storey") != storey:
        # Filter by storey — brute force among same storey
        storey_comps = [c for c in components if c.get("storey") == storey]
        if not storey_comps:
            return None
        storey_coords = np.array([[c["x"], c["y"], c["z"]] for c in storey_comps])
        dists = np.linalg.norm(storey_coords - np.array([x, y, z]), axis=1)
        best_idx = np.argmin(dists)
        if dists[best_idx] > max_distance:
            return None
        comp = storey_comps[best_idx]
        dist = dists[best_idx]

    return {**comp, "_distance": round(float(dist), 4)}


def main():
    parser = argparse.ArgumentParser(description="Map defect positions to BIM components")
    parser.add_argument("--json", required=True, help="Path to components.json")
    parser.add_argument("--x", type=float, required=True, help="Defect X coordinate")
    parser.add_argument("--y", type=float, required=True, help="Defect Y coordinate")
    parser.add_argument("--z", type=float, default=0.0, help="Defect Z coordinate")
    parser.add_argument("--storey", help="Filter by storey name")
    parser.add_argument("--max-distance", type=float, default=10.0, help="Maximum search distance")
    args = parser.parse_args()

    with open(args.json, "r", encoding="utf-8") as f:
        components = json.load(f)

    tree, _ = build_kdtree(components)
    result = find_nearest_component(tree, components, args.x, args.y, args.z, args.storey, args.max_distance)

    if result:
        print(f"Nearest component: {result['name']} ({result['type']})")
        print(f"  Global ID: {result['global_id']}")
        print(f"  Storey: {result['storey']}")
        print(f"  Distance: {result['_distance']} units")
    else:
        print("No component found within range.")


if __name__ == "__main__":
    main()
