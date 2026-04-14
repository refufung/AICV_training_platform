# AI-Powered Building Inspection Platform

> **POC** for AI-powered robotic building inspection using BIM, digital twins, and deep learning.

Detects structural defects (cracks, corrosion, spalling, mould, water damage) from images and links them to BIM (IFC) building elements for integrated facility management.

---

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Mobile App │───▶│  FastAPI      │───▶│  PostgreSQL      │
│  (React)    │    │  Backend      │    │  + PostGIS       │
│  YOLO + GPS │    │  /api/defects │    │  components      │
└─────────────┘    └──────┬───────┘    │  defects         │
                          │            └──────────────────┘
                          ▼
              ┌───────────────────────┐
              │  React Dashboard      │
              │  • 3D BIM Viewer      │
              │  • Floor Plan Locator │
              │  • Defect List        │
              │  • Stats & Charts     │
              └───────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Detection** | YOLO26, RF-DETR, PatchCore (Anomalib) |
| **Backend** | FastAPI, SQLAlchemy, PostgreSQL + PostGIS |
| **Frontend** | React + TypeScript + Vite, Tailwind CSS |
| **3D BIM** | That Open Engine (IFC.js v2) |
| **BIM Parsing** | IfcOpenShell |
| **Maps** | Leaflet + OpenStreetMap (free, no API key) |
| **Charts** | Recharts |
| **Simulator** | Blender 4.x + BlenderBIM |
| **Auth** | JWT (python-jose) |

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ (LTS)
- PostgreSQL 15+ with PostGIS extension
- Git

### Setup

```powershell
# 1. Clone
git clone <repo-url>
cd AICV_training_platform

# 2. Run setup (creates venv, installs dependencies)
powershell -ExecutionPolicy Bypass -File scripts\setup_env.ps1

# 3. Copy environment file
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 4. Initialize database
python -m backend.database.init_db

# 5. Parse IFC models
python scripts/parse_ifc.py

# 6. Start backend
.\venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000

# 7. Start frontend (new terminal)
cd frontend
npm run dev
```

Open http://localhost:5173 for the dashboard, http://localhost:8000/docs for API docs.

## Project Structure

```
AICV_training_platform/
├── backend/                 # FastAPI backend
│   ├── main.py              # API entry point
│   ├── models.py            # SQLAlchemy ORM models
│   ├── config.py            # Settings (from .env)
│   ├── locator.py           # KD-Tree positioning engine
│   ├── mapper.py            # Defect → BIM component mapping
│   ├── bcf_export.py        # BCF format export
│   ├── ifc_parser.py        # IfcOpenShell wrapper
│   ├── database/
│   │   ├── schema.sql       # PostgreSQL DDL
│   │   └── init_db.py       # DB initializer
│   ├── routes/
│   │   ├── defects.py       # /api/defects endpoints
│   │   ├── components.py    # /api/components endpoints
│   │   └── auth.py          # JWT authentication
│   └── uploads/             # Defect photos
├── frontend/                # React + TypeScript
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── BimViewer.tsx       # 3D IFC viewer
│       │   ├── FloorPlan.tsx       # Click-to-locate
│       │   ├── DefectList.tsx      # Filterable list
│       │   ├── DefectDetail.tsx    # Detail panel
│       │   ├── Dashboard.tsx       # Stats & charts
│       │   ├── MapView.tsx         # Leaflet map
│       │   └── PhotoCapture.tsx    # Camera + upload
│       └── api/
│           └── client.ts           # API client
├── scripts/
│   ├── parse_ifc.py         # IFC → components.json
│   ├── setup_env.ps1        # Windows environment setup
│   ├── check_gpu.py         # CUDA verification
│   ├── download_datasets.py # Dataset downloader
│   ├── convert_codebrim.py  # CODEBRIM → COCO JSON
│   ├── verify_dataset.py    # Label integrity check
│   └── verify_project.py    # Final submission checker
├── simulator/
│   ├── blender_scripts/     # Blender Python automation
│   │   ├── import_ifc.py
│   │   ├── inject_defects.py
│   │   └── robot_path.py
│   ├── textures/            # Defect PBR textures
│   └── models/              # Exported 3D models
├── datasets/                # Training data
├── models/                  # Weights & exports
├── results/                 # Metrics & visualizations
├── blender/                 # Blender project files
├── report/                  # Academic report
├── requirements.txt
├── .env.example
└── README.md
```

## Datasets

| Dataset | Images | Classes | Source |
|---------|--------|---------|--------|
| Concrete Crack | 40,000 | crack / no-crack | [Mendeley](https://data.mendeley.com/datasets/5y9wdsg2zt/2) |
| CODEBRIM | 1,590 | crack, spallation, corrosion, efflorescence, rebar | [Zenodo](https://zenodo.org/record/2620293) |
| SDNET2018 | 56,000+ | cracked / non-cracked (bridge, wall, pavement) | [Kaggle](https://www.kaggle.com/datasets/arunrk7/surface-crack-detection) |

## Key Features

1. **AI Defect Detection** — YOLO26 + RF-DETR multi-class detection on mobile
2. **BIM Integration** — Links each defect to a specific IFC building element (wall, column, slab)
3. **3D Visualization** — Interactive 3D BIM model with defect markers
4. **Floor Plan Positioning** — Click on floor plan to locate defects indoors
5. **CDE Updates** — Defect history + BCF export for BIM interoperability
6. **Web Dashboard** — Real-time stats, defect management workflow
7. **Robot Simulator** — Blender-based virtual environment for inspection testing
8. **Anomaly Detection** — PatchCore for unsupervised defect detection using BIM renders as reference

## License

Academic use. Datasets are subject to their respective licenses.

## References

See [report/references.md](report/references.md) for full IEEE-format citations.
