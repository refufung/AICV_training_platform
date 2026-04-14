"""Pydantic schemas for API request/response validation."""
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


# ─── Auth ──────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=4, max_length=200)
    role: str = "inspector"


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Components ────────────────────────────────────────────────────────────
class ComponentResponse(BaseModel):
    id: int
    global_id: str
    name: str
    type: str
    storey: str
    x: float
    y: float
    z: float
    bbox_min_x: float | None = None
    bbox_min_y: float | None = None
    bbox_min_z: float | None = None
    bbox_max_x: float | None = None
    bbox_max_y: float | None = None
    bbox_max_z: float | None = None
    defect_count: int = 0

    model_config = {"from_attributes": True}


# ─── Defects ───────────────────────────────────────────────────────────────
class DefectResponse(BaseModel):
    id: int
    photo_url: str
    defect_class: str
    confidence: float
    bbox: dict
    gps_lat: float | None = None
    gps_lng: float | None = None
    floor: str
    component_id: int | None = None
    component_name: str | None = None
    component_type: str | None = None
    severity: str
    status: str
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DefectUpdate(BaseModel):
    severity: str | None = None
    status: str | None = None
    notes: str | None = None
    component_id: int | None = None


class DefectStats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_severity: dict[str, int]
    by_class: dict[str, int]
    by_floor: dict[str, int]
    recent: list[DefectResponse]


# ─── BCF Topics ───────────────────────────────────────────────────────────────────
class BcfCommentResponse(BaseModel):
    id: int
    guid: str
    text: str
    author: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class BcfTopicCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    topic_type: str = "issue"
    priority: str = "normal"
    status: str = "open"
    assigned_to: str | None = None
    due_date: datetime | None = None
    viewpoint: str | None = None
    ifc_guids: str | None = None
    defect_id: int | None = None


class BcfTopicResponse(BaseModel):
    id: int
    guid: str
    title: str
    description: str | None = None
    topic_type: str
    priority: str
    status: str
    assigned_to: str | None = None
    due_date: datetime | None = None
    viewpoint: str | None = None
    ifc_guids: str | None = None
    defect_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    comments: list[BcfCommentResponse] = []

    model_config = {"from_attributes": True}


class BcfTopicUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    topic_type: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    due_date: datetime | None = None
    viewpoint: str | None = None
    ifc_guids: str | None = None


class BcfCommentCreate(BaseModel):
    text: str = Field(..., min_length=1)
    author: str | None = None
