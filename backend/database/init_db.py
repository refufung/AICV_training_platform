"""
Initialize the database: create tables and optionally seed with IFC components.

Usage:
    python -m backend.database.init_db [--seed path/to/components.json]
"""
import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.database.models import engine, SessionLocal, Base, BimComponent, User, UserRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created.")


def seed_admin(db):
    """Create default admin user if not exists."""
    existing = db.query(User).filter(User.username == "admin").first()
    if existing:
        print("  Admin user already exists, skipping.")
        return
    admin = User(
        username="admin",
        hashed_password=pwd_context.hash("admin123"),
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    print("  ✓ Created admin user (username: admin, password: admin123)")


def seed_components(db, json_path: str):
    """Load components from parse_ifc.py JSON output into the database."""
    path = Path(json_path)
    if not path.exists():
        print(f"  ERROR: {json_path} not found. Run parse_ifc.py first.")
        return

    with open(path, "r", encoding="utf-8") as f:
        components = json.load(f)

    count = 0
    for c in components:
        existing = db.query(BimComponent).filter(
            BimComponent.global_id == c["global_id"]
        ).first()
        if existing:
            continue

        comp = BimComponent(
            global_id=c["global_id"],
            name=c["name"],
            type=c["type"],
            storey=c["storey"],
            x=c.get("x", 0),
            y=c.get("y", 0),
            z=c.get("z", 0),
            bbox_min_x=c.get("bbox_min_x"),
            bbox_min_y=c.get("bbox_min_y"),
            bbox_min_z=c.get("bbox_min_z"),
            bbox_max_x=c.get("bbox_max_x"),
            bbox_max_y=c.get("bbox_max_y"),
            bbox_max_z=c.get("bbox_max_z"),
            ifc_file=c.get("ifc_file"),
        )
        db.add(comp)
        count += 1

    db.commit()
    print(f"  ✓ Seeded {count} new components (skipped {len(components) - count} duplicates)")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Initialize AI Inspection database")
    parser.add_argument("--seed", help="Path to components.json from parse_ifc.py")
    args = parser.parse_args()

    create_tables()

    db = SessionLocal()
    try:
        seed_admin(db)
        if args.seed:
            seed_components(db, args.seed)
    finally:
        db.close()

    print("\n✓ Database initialization complete.")


if __name__ == "__main__":
    main()
