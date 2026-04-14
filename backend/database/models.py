"""
SQLAlchemy database models for the AI Inspection Platform.
Uses PostgreSQL + PostGIS for spatial queries.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum, Index,
    create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func
import enum
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./aicv.db"
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─── Enums ─────────────────────────────────────────────────────────────────
class DefectClassEnum(str, enum.Enum):
    crack = "crack"
    spallation = "spallation"
    corrosion = "corrosion"
    efflorescence = "efflorescence"
    exposed_rebar = "exposed_rebar"
    water_damage = "water_damage"
    mould = "mould"
    other = "other"


class SeverityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class DefectStatusEnum(str, enum.Enum):
    new = "new"
    reviewed = "reviewed"
    repairing = "repairing"
    fixed = "fixed"


class UserRole(str, enum.Enum):
    inspector = "inspector"
    admin = "admin"


# ─── Models ────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.inspector, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    defects = relationship("Defect", back_populates="inspector")


class BimComponent(Base):
    __tablename__ = "bim_components"

    id = Column(Integer, primary_key=True, index=True)
    global_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False, index=True)
    storey = Column(String(50), nullable=False, index=True)
    x = Column(Float, nullable=False, default=0)
    y = Column(Float, nullable=False, default=0)
    z = Column(Float, nullable=False, default=0)
    bbox_min_x = Column(Float, nullable=True)
    bbox_min_y = Column(Float, nullable=True)
    bbox_min_z = Column(Float, nullable=True)
    bbox_max_x = Column(Float, nullable=True)
    bbox_max_y = Column(Float, nullable=True)
    bbox_max_z = Column(Float, nullable=True)
    ifc_file = Column(String(255), nullable=True)

    defects = relationship("Defect", back_populates="component")

    # Spatial index on (x, y, z) for nearest-neighbor queries
    __table_args__ = (
        Index("ix_bim_components_xyz", "x", "y", "z"),
        Index("ix_bim_components_storey_type", "storey", "type"),
    )


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    photo_path = Column(String(500), nullable=False)
    defect_class = Column(Enum(DefectClassEnum), nullable=False, index=True)
    confidence = Column(Float, nullable=False, default=0.0)
    bbox_x = Column(Float, default=0)
    bbox_y = Column(Float, default=0)
    bbox_w = Column(Float, default=0)
    bbox_h = Column(Float, default=0)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    floor = Column(String(20), nullable=False, default="1F", index=True)
    severity = Column(Enum(SeverityEnum), default=SeverityEnum.medium, nullable=False, index=True)
    status = Column(Enum(DefectStatusEnum), default=DefectStatusEnum.new, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Foreign keys
    component_id = Column(Integer, ForeignKey("bim_components.id"), nullable=True, index=True)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    component = relationship("BimComponent", back_populates="defects")
    inspector = relationship("User", back_populates="defects")

    __table_args__ = (
        Index("ix_defects_class_severity", "defect_class", "severity"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    read = Column(Integer, default=0, nullable=False)  # 0/1 for SQLite compat
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")

class BcfTopicTypeEnum(str, enum.Enum):
    issue = "issue"
    request = "request"
    comment = "comment"
    solution = "solution"


class BcfTopicStatusEnum(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"
    resolved = "resolved"


class BcfPriorityEnum(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    critical = "critical"


class BcfTopic(Base):
    __tablename__ = "bcf_topics"

    id = Column(Integer, primary_key=True, index=True)
    guid = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    topic_type = Column(Enum(BcfTopicTypeEnum), default=BcfTopicTypeEnum.issue)
    priority = Column(Enum(BcfPriorityEnum), default=BcfPriorityEnum.normal)
    status = Column(Enum(BcfTopicStatusEnum), default=BcfTopicStatusEnum.open)
    assigned_to = Column(String(100), nullable=True)
    due_date = Column(DateTime, nullable=True)
    viewpoint = Column(Text, nullable=True)
    ifc_guids = Column(Text, nullable=True)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    defect = relationship("Defect")
    creator = relationship("User")
    comments = relationship("BcfComment", back_populates="topic", cascade="all, delete-orphan")


class BcfComment(Base):
    __tablename__ = "bcf_comments"

    id = Column(Integer, primary_key=True, index=True)
    guid = Column(String(64), unique=True, nullable=False)
    topic_id = Column(Integer, ForeignKey("bcf_topics.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    author = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    topic = relationship("BcfTopic", back_populates="comments")

# ─── Database helpers ──────────────────────────────────────────────────────
def get_db():
    """FastAPI dependency: yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created.")
