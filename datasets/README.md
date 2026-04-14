# Datasets

This directory contains defect inspection image datasets for model training.

## Datasets

| Name | Description | Classes | Size |
|------|------------|---------|------|
| **concrete_crack** | Concrete Crack Images for Classification | Positive / Negative (binary) | ~40k images |
| **CODEBRIM** | Multi-target concrete defect classification | Crack, Spallation, Efflorescence, Exposed-bars, Corrosion | ~7.7k images |
| **SDNET2018** | Annotated image dataset for concrete cracks | Cracked / Non-cracked (bridge, pavement, wall) | ~56k images |

## Download

```bash
python scripts/download_datasets.py --all
```

Or download individual datasets:
```bash
python scripts/download_datasets.py --crack
python scripts/download_datasets.py --codebrim
python scripts/download_datasets.py --sdnet
```

## Directory Structure

```
datasets/
├── concrete_crack/     # Binary crack classification
│   ├── Positive/
│   └── Negative/
├── codebrim/           # Multi-label bridge defects
│   ├── images/
│   └── annotations/
└── sdnet2018/          # Wall/bridge/pavement cracks
    ├── W/              # Wall
    ├── D/              # Bridge deck
    └── P/              # Pavement
```

## Notes

- Datasets are excluded from git via `.gitignore`
- Some datasets may require manual download if automated download fails
- Total disk space needed: ~15 GB
