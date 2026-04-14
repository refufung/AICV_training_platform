"""
Notification service — sends alerts when high/critical defects are created.

Supports:
  - In-app notifications (DB-stored)
  - Webhook (HTTP POST to a configured URL)
  - Email (SMTP – optional, skipped when not configured)
"""
import os
import json
import logging
from typing import Optional
from urllib.request import Request, urlopen
from sqlalchemy.orm import Session

from backend.database.models import Notification, Defect, User

logger = logging.getLogger(__name__)

# ── Config from environment ───────────────────────────────────────────────
WEBHOOK_URL: Optional[str] = os.getenv("WEBHOOK_URL")
SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
SMTP_PASS: Optional[str] = os.getenv("SMTP_PASS")
NOTIFY_EMAIL_TO: Optional[str] = os.getenv("NOTIFY_EMAIL_TO")

# Severity levels that trigger external notifications
_ALERT_SEVERITIES = {"critical", "high"}


def notify_defect_created(db: Session, defect: Defect) -> None:
    """
    Fire notifications for a newly created defect.
    Always creates an in-app notification; external channels fire only
    for high / critical severity.
    """
    comp_name = defect.component.name if defect.component else "unlinked"
    msg = (
        f"New {defect.severity.value} {defect.defect_class.value} defect "
        f"on floor {defect.floor} ({comp_name})"
    )
    link = f"/defects/{defect.id}"

    # 1. In-app notification for all admin users
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        n = Notification(user_id=admin.id, message=msg, link=link, read=0)
        db.add(n)
    db.commit()

    # 2. External alerts — only for high+ severity
    if defect.severity.value not in _ALERT_SEVERITIES:
        return

    payload = {
        "defect_id": defect.id,
        "defect_class": defect.defect_class.value,
        "severity": defect.severity.value,
        "floor": defect.floor,
        "component": comp_name,
        "message": msg,
    }

    _send_webhook(payload)
    _send_email(msg, json.dumps(payload, indent=2))


def _send_webhook(payload: dict) -> None:
    if not WEBHOOK_URL:
        return
    try:
        data = json.dumps(payload).encode("utf-8")
        req = Request(WEBHOOK_URL, data=data, headers={"Content-Type": "application/json"}, method="POST")
        urlopen(req, timeout=10)
        logger.info("Webhook sent to %s", WEBHOOK_URL)
    except Exception as exc:
        logger.warning("Webhook failed: %s", exc)


def _send_email(subject: str, body: str) -> None:
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO]):
        return
    try:
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(body)
        msg["Subject"] = f"[AI Inspection] {subject}"
        msg["From"] = SMTP_USER
        msg["To"] = NOTIFY_EMAIL_TO

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [NOTIFY_EMAIL_TO], msg.as_string())
        logger.info("Email sent to %s", NOTIFY_EMAIL_TO)
    except Exception as exc:
        logger.warning("Email failed: %s", exc)
