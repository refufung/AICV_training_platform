"""
Blender script: Apply defect textures (cracks, rust, water stains, mould)
to building surfaces for synthetic defect image generation.

Run from Blender:
    blender <scene.blend> --background --python simulator/blender_scripts/apply_defect_textures.py -- --texture-dir ./blender/textures --output ./blender/defect_views

This creates synthetic training data by overlaying defect textures onto
clean building surfaces.
"""
import bpy
import json
import os
import random
import sys
from pathlib import Path


DEFECT_TYPES = ["cracks", "rust", "water_stains", "mould"]


def load_textures(texture_dir: Path) -> dict[str, list[str]]:
    """Discover texture images organized by defect type."""
    textures = {}
    for defect_type in DEFECT_TYPES:
        folder = texture_dir / defect_type
        if folder.exists():
            files = [
                str(f) for f in folder.iterdir()
                if f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.tif', '.tiff')
            ]
            if files:
                textures[defect_type] = files
                print(f"  Found {len(files)} {defect_type} textures")
    return textures


def create_defect_material(texture_path: str, defect_type: str) -> bpy.types.Material:
    """Create a Blender material that overlays a defect texture."""
    mat_name = f"Defect_{defect_type}_{Path(texture_path).stem}"
    mat = bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear defaults
    for node in nodes:
        nodes.remove(node)

    # Shader nodes
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)

    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.location = (0, 0)

    tex_image = nodes.new('ShaderNodeTexImage')
    tex_image.location = (-400, 0)
    tex_image.image = bpy.data.images.load(texture_path)

    tex_coord = nodes.new('ShaderNodeTexCoord')
    tex_coord.location = (-800, 0)

    mapping = nodes.new('ShaderNodeMapping')
    mapping.location = (-600, 0)
    # Random scale and rotation for variety
    scale = random.uniform(0.5, 2.0)
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    mapping.inputs['Rotation'].default_value = (0, 0, random.uniform(0, 6.28))

    # Links
    links.new(tex_coord.outputs['UV'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], tex_image.inputs['Vector'])
    links.new(tex_image.outputs['Color'], principled.inputs['Base Color'])
    links.new(principled.outputs['BSDF'], output.inputs['Surface'])

    return mat


def apply_texture_to_object(obj, material):
    """Replace or add material to object."""
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def main():
    argv = sys.argv
    texture_dir = Path("./blender/textures")
    output_dir = Path("./blender/defect_views")

    if "--" in argv:
        args = argv[argv.index("--") + 1:]
        for i, arg in enumerate(args):
            if arg == "--texture-dir" and i + 1 < len(args):
                texture_dir = Path(args[i + 1])
            elif arg == "--output" and i + 1 < len(args):
                output_dir = Path(args[i + 1])

    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Applying defect textures to building surfaces")
    print("=" * 60)

    textures = load_textures(texture_dir)
    if not textures:
        print("No textures found! Place texture images in:")
        for dt in DEFECT_TYPES:
            print(f"  {texture_dir / dt}/")
        return

    # Find mesh objects
    mesh_objects = [o for o in bpy.data.objects if o.type == 'MESH']
    if not mesh_objects:
        print("No mesh objects in scene!")
        return

    cam = bpy.context.scene.camera
    if not cam:
        print("No camera in scene!")
        return

    bpy.context.scene.cycles.samples = 64
    bpy.context.scene.render.resolution_x = 1024
    bpy.context.scene.render.resolution_y = 768

    annotations = []
    render_idx = 0

    for defect_type, tex_files in textures.items():
        type_dir = output_dir / defect_type
        type_dir.mkdir(exist_ok=True)

        for tex_path in tex_files[:5]:  # Limit per type
            material = create_defect_material(tex_path, defect_type)

            # Apply to random subset of objects
            targets = random.sample(mesh_objects, min(3, len(mesh_objects)))

            for obj in targets:
                # Save original material
                orig_mats = list(obj.data.materials)

                apply_texture_to_object(obj, material)

                out_file = str(type_dir / f"{defect_type}_{render_idx:04d}.png")
                bpy.context.scene.render.filepath = out_file

                try:
                    bpy.ops.render.render(write_still=True)
                    annotations.append({
                        "file": out_file,
                        "defect_type": defect_type,
                        "texture_file": tex_path,
                        "object_name": obj.name,
                        "render_index": render_idx,
                    })
                    render_idx += 1
                except Exception as e:
                    print(f"  WARNING: render failed: {e}")

                # Restore original materials
                obj.data.materials.clear()
                for m in orig_mats:
                    obj.data.materials.append(m)

    # Save annotations
    anno_path = output_dir / "annotations.json"
    with open(anno_path, "w") as f:
        json.dump(annotations, f, indent=2)

    print(f"\n✓ Generated {render_idx} defect images")
    print(f"✓ Annotations saved to {anno_path}")


if __name__ == "__main__":
    main()
