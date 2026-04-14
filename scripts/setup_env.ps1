# ============================================================
# BIM Defect Management Platform — Windows Environment Setup
# Run: powershell -ExecutionPolicy Bypass -File scripts\setup_env.ps1
# ============================================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " BIM Defect Platform — Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python version
Write-Host "[1/5] Checking Python..." -ForegroundColor Yellow
$pyVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Python not found. Install Python 3.10+ from https://python.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Found: $pyVersion" -ForegroundColor Green

# 2. Create virtual environment
Write-Host "[2/5] Creating Python virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "  venv/ already exists — skipping" -ForegroundColor DarkYellow
} else {
    python -m venv venv
    Write-Host "  Created venv/" -ForegroundColor Green
}

# 3. Activate and install Python dependencies
Write-Host "[3/5] Installing Python dependencies..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
Write-Host "  Python packages installed" -ForegroundColor Green

# 4. Check Node.js
Write-Host "[4/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Node.js not found. Install from https://nodejs.org (LTS)" -ForegroundColor Red
    Write-Host "  Frontend setup will be skipped" -ForegroundColor Red
} else {
    Write-Host "  Found: Node.js $nodeVersion" -ForegroundColor Green

    # 5. Install frontend dependencies
    Write-Host "[5/5] Installing frontend dependencies..." -ForegroundColor Yellow
    if (Test-Path "frontend\package.json") {
        Set-Location frontend
        npm install --silent
        Set-Location ..
        Write-Host "  Frontend packages installed" -ForegroundColor Green
    } else {
        Write-Host "  No frontend/package.json found — run frontend setup first" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Setup complete! Next steps:" -ForegroundColor Cyan
Write-Host "  1. Activate venv:  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  2. Start backend:  uvicorn backend.main:app --reload" -ForegroundColor White
Write-Host "  3. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
