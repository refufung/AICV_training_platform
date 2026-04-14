"""
Blender script: Import IFC model using BlenderBIM and set up the scene.

Run from Blender:
    blender --background --python simulator/blender_scripts/setup_scene.py -- <ifc_path>

Requires: BlenderBIM addon installed in Blender
"""
import bpy
import sys
import os
import math

def clear_scene():
    """Remove all objects from the default scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)


def setup_lighting():
    """Add studio lighting for realistic renders."""
    # Sun light
    bpy.ops.object.light_add(type='SUN', location=(10, 10, 20))
    sun = bpy.context.active_object
    sun.name = "Sun_Main"
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(30))

    # Fill light
    bpy.ops.object.light_add(type='AREA', location=(-5, -5, 10))
    fill = bpy.context.active_object
    fill.name = "Fill_Light"
    fill.data.energy = 100
    fill.data.size = 5


def setup_camera(target_location=(0, 0, 1.5)):
    """Position camera looking at the building."""
    bpy.ops.object.camera_add(location=(15, -15, 10))
    cam = bpy.context.active_object
    cam.name = "InspectionCamera"

    # Point camera at target
    direction = (
        target_location[0] - cam.location.x,
        target_location[1] - cam.location.y,
        target_location[2] - cam.location.z,
    )
    rot_quat = bpy.types.Object.rotation_euler.__class__((0, 0, 0))
    # Use track-to constraint instead
    constraint = cam.constraints.new(type='TRACK_TO')
    empty = bpy.ops.object.empty_add(location=target_location)
    target = bpy.context.active_object
    target.name = "CameraTarget"
    constraint.target = target
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'

    bpy.context.scene.camera = cam
    cam.data.lens = 35
    cam.data.clip_end = 500

    return cam


def import_ifc(ifc_path: str):
    """Import IFC file using BlenderBIM."""
    if not os.path.exists(ifc_path):
        print(f"ERROR: IFC file not found: {ifc_path}")
        return False

    try:
        bpy.ops.bim.load_project(filepath=ifc_path)
        print(f"✓ Loaded IFC: {ifc_path}")
        return True
    except Exception as e:
        print(f"BlenderBIM import failed: {e}")
        # Fallback: try native IFC import (Blender 4.x)
        try:
            bpy.ops.import_scene.ifc(filepath=ifc_path)
            print(f"✓ Loaded IFC (native): {ifc_path}")
            return True
        except Exception as e2:
            print(f"Native IFC import also failed: {e2}")
            return False


def setup_render_settings():
    """Configure render settings for inspection renders."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = 128
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.film_transparent = True


def main():
    # Parse arguments after "--"
    argv = sys.argv
    ifc_path = None
    if "--" in argv:
        args = argv[argv.index("--") + 1:]
        if args:
            ifc_path = args[0]

    if not ifc_path:
        print("Usage: blender --background --python setup_scene.py -- <ifc_path>")
        return

    print("=" * 60)
    print("Setting up Blender scene for AI inspection simulation")
    print("=" * 60)

    clear_scene()
    print("✓ Scene cleared")

    if import_ifc(ifc_path):
        setup_lighting()
        print("✓ Lighting added")

        setup_camera()
        print("✓ Camera positioned")

        setup_render_settings()
        print("✓ Render settings configured")

        # Save blend file
        output = ifc_path.replace(".ifc", "_scene.blend")
        bpy.ops.wm.save_as_mainfile(filepath=output)
        print(f"✓ Saved scene: {output}")
    else:
        print("✗ Failed to import IFC file")


if __name__ == "__main__":
    main()
