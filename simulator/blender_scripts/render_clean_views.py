"""
Blender script: Simulate robot inspection path and render clean views
of building surfaces for defect texture application.

Run from Blender:
    blender <scene.blend> --background --python simulator/blender_scripts/render_clean_views.py -- --output ./blender/clean_views

Output:
    - Rendered images of each wall/slab surface from robot POV
    - Camera position metadata JSON
"""
import bpy
import json
import math
import os
import sys
from pathlib import Path


def get_inspectable_objects():
    """Find wall and slab objects in the scene."""
    targets = []
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        name = obj.name.lower()
        if any(k in name for k in ['wall', 'slab', 'column', 'beam', 'ceiling']):
            targets.append(obj)
    
    if not targets:
        # Fallback: all mesh objects
        targets = [o for o in bpy.data.objects if o.type == 'MESH']
    
    return targets


def compute_surface_viewpoints(obj, distance=2.0, count=4):
    """Generate camera viewpoints facing the object's surfaces."""
    import mathutils

    # Transform bounding box corners to world space
    bbox_world = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]

    # Compute center from world-space bounding box
    xs = [v.x for v in bbox_world]
    ys = [v.y for v in bbox_world]
    zs = [v.z for v in bbox_world]
    center = mathutils.Vector((
        (min(xs) + max(xs)) / 2,
        (min(ys) + max(ys)) / 2,
        (min(zs) + max(zs)) / 2,
    ))

    viewpoints = []
    for angle in range(0, 360, 360 // max(count, 1)):
        rad = math.radians(angle)
        cam_loc = (
            center.x + distance * math.cos(rad),
            center.y + distance * math.sin(rad),
            center.z + 1.5,
        )
        viewpoints.append({
            "location": cam_loc,
            "target": (center.x, center.y, center.z + 1.5),
            "angle_deg": angle,
            "object_name": obj.name,
        })

    return viewpoints


def render_viewpoint(cam, viewpoint, output_path):
    """Position camera and render."""
    cam.location = viewpoint["location"]

    # Point at target using track-to
    for c in cam.constraints:
        cam.constraints.remove(c)
    
    target_empty = bpy.data.objects.get("RenderTarget")
    if not target_empty:
        bpy.ops.object.empty_add(location=viewpoint["target"])
        target_empty = bpy.context.active_object
        target_empty.name = "RenderTarget"
    else:
        target_empty.location = viewpoint["target"]

    constraint = cam.constraints.new(type='TRACK_TO')
    constraint.target = target_empty
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'

    bpy.context.scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv
    output_dir = "./blender/clean_views"
    
    if "--" in argv:
        args = argv[argv.index("--") + 1:]
        for i, arg in enumerate(args):
            if arg == "--output" and i + 1 < len(args):
                output_dir = args[i + 1]

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Rendering clean surface views for inspection simulation")
    print("=" * 60)

    targets = get_inspectable_objects()
    print(f"Found {len(targets)} inspectable objects")

    cam = bpy.context.scene.camera
    if not cam:
        bpy.ops.object.camera_add()
        cam = bpy.context.active_object
        bpy.context.scene.camera = cam

    # Lower quality for batch renders
    bpy.context.scene.cycles.samples = 64
    bpy.context.scene.render.resolution_x = 1024
    bpy.context.scene.render.resolution_y = 768

    metadata = []
    render_idx = 0

    for obj in targets[:20]:  # Limit to 20 objects
        viewpoints = compute_surface_viewpoints(obj, distance=3.0, count=2)
        
        for vp in viewpoints:
            out_path = str(output_dir / f"view_{render_idx:04d}.png")
            print(f"  Rendering view {render_idx}: {obj.name} @ {vp['angle_deg']}°")
            
            try:
                render_viewpoint(cam, vp, out_path)
                vp["output_file"] = out_path
                vp["render_index"] = render_idx
                metadata.append(vp)
                render_idx += 1
            except Exception as e:
                print(f"    WARNING: Render failed: {e}")

    # Save metadata
    meta_path = output_dir / "viewpoints.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2, default=str)

    print(f"\n✓ Rendered {render_idx} views to {output_dir}")
    print(f"✓ Metadata saved to {meta_path}")


if __name__ == "__main__":
    main()
