"""
AI Inspection Platform — FastAPI Application Entry Point.

Run: uvicorn backend.main:app --reload --port 8000
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routes import auth, defects, components, reports, locate, notifications

app = FastAPI(
    title="AI Building Inspection API",
    version="1.0.0",
    description="Backend API for AI-powered building defect detection and BIM integration",
)

# CORS (allow frontend dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount upload directory for serving defect photos
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "backend/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Register route modules
app.include_router(auth.router, prefix="/api")
app.include_router(defects.router, prefix="/api")
app.include_router(components.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(locate.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


# --- IFC file serving ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent


@app.get("/api/ifc/list")
def list_ifc_files():
    """Return available IFC files."""
    ifc_files = sorted(PROJECT_ROOT.glob("*.ifc"))
    return [{"name": f.name, "size_mb": round(f.stat().st_size / 1_048_576, 1)} for f in ifc_files]


@app.get("/api/ifc/download/{filename}")
def download_ifc(filename: str):
    """Serve an IFC file for the viewer."""
    # Prevent path traversal
    safe_name = Path(filename).name
    filepath = PROJECT_ROOT / safe_name
    if not filepath.exists() or not filepath.suffix.lower() == ".ifc":
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="IFC file not found")
    return FileResponse(filepath, media_type="application/octet-stream", filename=safe_name)
