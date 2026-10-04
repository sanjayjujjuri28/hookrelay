from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.sql import func

from app.database import Base


# =========================================================
# USER
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    hashed_password = Column(
        String,
        nullable=False
    )

    is_verified = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # Password reset fields
    password_reset_token = Column(
        String,
        nullable=True
    )

    password_reset_expires_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


# =========================================================
# EMAIL VERIFICATION / PASSWORD RESET OTP
# =========================================================

class EmailVerificationOTP(Base):
    __tablename__ = "email_verification_otps"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    otp = Column(
        String,
        nullable=False
    )

    purpose = Column(
        String,
        nullable=False,
        default="email_verification"
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# WEBHOOK
# =========================================================

class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    target_url = Column(
        String,
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    secret = Column(
        String,
        nullable=False,
        unique=True
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# WEBHOOK DELIVERY
# =========================================================

class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    webhook_id = Column(
        Integer,
        ForeignKey("webhooks.id"),
        nullable=False
    )

    event_payload = Column(
        JSON,
        nullable=False
    )

    status_code = Column(
        Integer,
        nullable=True
    )

    status = Column(
        String,
        nullable=False
    )

    attempt_number = Column(
        Integer,
        nullable=False,
        default=1
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    error_message = Column(
        String,
        nullable=True
    )