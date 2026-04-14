"""
Download and organize public concrete defect datasets.
Usage: python scripts/download_datasets.py [--all | --crack | --codebrim | --sdnet]
"""
import os
import sys
import zipfile
import tarfile
import argparse
import urllib.request
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent / "datasets"

DATASETS = {
    "concrete_crack": {
        "url": "https://data.mendeley.com/public-files/datasets/5y9wdsg2zt/files/8a70d8a5-bce9-4291-bab9-b48a24e3b49f/file_downloaded",
        "desc": "Concrete Crack Images (40k images, 2 classes: positive/negative)",
        "ext": ".zip",
    },
    "codebrim": {
        "url": "https://zenodo.org/records/2620293/files/CODEBRIM.zip",
        "desc": "CODEBRIM multi-target bridge defect dataset",
        "ext": ".zip",
    },
    "sdnet2018": {
        "url": "https://digitalcommons.usu.edu/cgi/viewcontent.cgi?filename=SDNET2018.zip&article=3018&context=all_datasets&type=additional",
        "desc": "SDNET2018 annotated crack images (walls, bridges, pavements)",
        "ext": ".zip",
    },
}


def download_file(url: str, dest: Path):
    """Download a file with progress display."""
    print(f"  Downloading {dest.name} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, "wb") as f:
        total = resp.headers.get("Content-Length")
        downloaded = 0
        chunk_size = 1024 * 256
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded / int(total) * 100
                print(f"\r  {downloaded / 1e6:.1f} MB / {int(total) / 1e6:.1f} MB  ({pct:.0f}%)", end="")
            else:
                print(f"\r  {downloaded / 1e6:.1f} MB downloaded", end="")
    print()


def extract_archive(archive: Path, dest_dir: Path):
    """Extract zip or tar archive to dest_dir."""
    print(f"  Extracting to {dest_dir} ...")
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive, "r") as z:
            z.extractall(dest_dir)
    elif archive.suffix in (".tar", ".gz", ".tgz"):
        with tarfile.open(archive, "r:*") as t:
            t.extractall(dest_dir, filter="data")
    else:
        print(f"  Unknown archive format: {archive.suffix}")
        return
    archive.unlink()
    print("  Done.")


def download_dataset(name: str):
    info = DATASETS[name]
    dest_dir = BASE_DIR / name
    if dest_dir.exists() and any(dest_dir.iterdir()):
        print(f"[SKIP] {name}: already exists at {dest_dir}")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    archive = dest_dir / f"{name}{info['ext']}"

    print(f"\n=== {name}: {info['desc']} ===")
    try:
        download_file(info["url"], archive)
        extract_archive(archive, dest_dir)
    except Exception as e:
        print(f"  ERROR: {e}")
        print(f"  You may need to download manually from: {info['url']}")


def main():
    parser = argparse.ArgumentParser(description="Download defect inspection datasets")
    parser.add_argument("--all", action="store_true", help="Download all datasets")
    parser.add_argument("--crack", action="store_true", help="Concrete Crack Images")
    parser.add_argument("--codebrim", action="store_true", help="CODEBRIM dataset")
    parser.add_argument("--sdnet", action="store_true", help="SDNET2018 dataset")
    args = parser.parse_args()

    if not any([args.all, args.crack, args.codebrim, args.sdnet]):
        parser.print_help()
        print("\nNo dataset selected. Use --all to download everything.")
        return

    BASE_DIR.mkdir(parents=True, exist_ok=True)

    if args.all or args.crack:
        download_dataset("concrete_crack")
    if args.all or args.codebrim:
        download_dataset("codebrim")
    if args.all or args.sdnet:
        download_dataset("sdnet2018")

    print("\n✓ Dataset download complete.")
    print(f"  Location: {BASE_DIR}")


if __name__ == "__main__":
    main()
