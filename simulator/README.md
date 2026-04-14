# Blender Simulator

This directory contains Blender Python scripts for the robot inspection simulator.

## Prerequisites

- **Blender 4.x** (with Python 3.11+)
- **BlenderBIM addon** (for IFC import): https://blenderbim.org/

## Scripts

### 1. `setup_scene.py` — Scene Setup

Import an IFC building model into Blender, add lighting and camera.

```bash
blender --background --python simulator/blender_scripts/setup_scene.py -- path/to/model.ifc
```

Output: `model_scene.blend` (Blender file with imported building)

### 2. `render_clean_views.py` — Clean Surface Renders

Simulate robot inspection path and render clean views of building surfaces.

```bash
blender model_scene.blend --background --python simulator/blender_scripts/render_clean_views.py -- --output ./blender/clean_views
```

Output:
- `blender/clean_views/view_XXXX.png` — Rendered surface images
- `blender/clean_views/viewpoints.json` — Camera position metadata

### 3. `apply_defect_textures.py` — Synthetic Defect Generation

Apply defect textures to surfaces and render synthetic training images.

```bash
blender model_scene.blend --background --python simulator/blender_scripts/apply_defect_textures.py -- --texture-dir ./blender/textures --output ./blender/defect_views
```

Required texture directory structure:
```
blender/textures/
├── cracks/          # Crack texture images
├── rust/            # Rust/corrosion textures
├── water_stains/    # Water damage textures
└── mould/           # Mould/efflorescence textures
```

Output:
- `blender/defect_views/<type>/defect_XXXX.png` — Rendered defect images
- `blender/defect_views/annotations.json` — Defect annotation metadata

## Workflow

1. Place IFC files in project root
2. Run `setup_scene.py` to create the Blender scene
3. Run `render_clean_views.py` to get baseline surface images
4. Add texture images to `blender/textures/<type>/`
5. Run `apply_defect_textures.py` to generate synthetic defect data
