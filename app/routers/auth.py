from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, EmailVerificationOTP

from app.schemas import (
    UserCreate,
    UserResponse,
    UserLogin,
    OTPVerify
)

from app.utils import (
    hash_password,
    verify_password,
    generate_otp
)

from app.auth import (
    create_access_token,
    get_current_user
)

from app.services.email_service import (
    send_verification_email,
    send_password_reset_email
)
from app.schemas import (
    UserCreate,
    UserResponse,
    UserLogin,
    OTPVerify,
    ResetPassword,
    ForgotPasswordRequest
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # 1. Check whether email already exists

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    # 2. Hash password

    hashed_password = hash_password(
        user.password
    )

    # 3. Create user

    new_user = User(
        email=user.email,
        hashed_password=hashed_password
    )

    db.add(new_user)

    # 4. Get new_user.id

    db.flush()

    # 5. Generate verification OTP

    otp = generate_otp()

    # 6. OTP expires after 5 minutes

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=5)
    )

    # 7. Create verification OTP

    verification_otp = EmailVerificationOTP(
        user_id=new_user.id,
        otp=otp,
        purpose="email_verification",
        expires_at=expires_at
    )

    db.add(verification_otp)

    # 8. Save user + OTP

    db.commit()

    # 9. Refresh user

    db.refresh(new_user)

    # 10. Send verification email

    send_verification_email(
        user.email,
        otp
    )

    # 11. Return user with dev_otp attached
    new_user.dev_otp = otp
    new_user.message = "Registration successful. Please enter your verification code."

    return new_user


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):

    # 1. Find user

    db_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # 2. Verify password

    if not verify_password(
        user.password,
        db_user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # 3. Check email verification

    if not db_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in"
        )

    # 4. Create JWT

    access_token = create_access_token(
        data={
            "sub": str(db_user.id)
        }
    )

    # 5. Return JWT

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_verified": current_user.is_verified
    }


# =========================================================
# VERIFY EMAIL
# =========================================================

@router.post("/verify-email")
def verify_email(
    data: OTPVerify,
    db: Session = Depends(get_db)
):

    # 1. Find user

    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # 2. Find latest EMAIL VERIFICATION OTP

    verification_otp = (
        db.query(EmailVerificationOTP)
        .filter(
            EmailVerificationOTP.user_id == user.id,
            EmailVerificationOTP.purpose == "email_verification"
        )
        .order_by(
            EmailVerificationOTP.created_at.desc()
        )
        .first()
    )

    if not verification_otp:
        raise HTTPException(
            status_code=400,
            detail="OTP not found"
        )

    # 3. Check expiration

    if (
        datetime.now(timezone.utc)
        > verification_otp.expires_at
    ):
        db.delete(verification_otp)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    # 4. Check OTP

    if verification_otp.otp != data.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    # 5. Mark email verified

    user.is_verified = True

    # 6. Delete used OTP

    db.delete(verification_otp)

    # 7. Save

    db.commit()

    return {
        "message": "Email verified successfully"
    }


# =========================================================
# RESEND VERIFICATION OTP
# =========================================================

@router.post("/resend-otp")
def resend_otp(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.is_verified:
        return {
            "message": "Email is already verified. Please sign in."
        }

    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    verification_otp = EmailVerificationOTP(
        user_id=user.id,
        otp=otp,
        purpose="email_verification",
        expires_at=expires_at
    )
    db.add(verification_otp)
    db.commit()

    send_verification_email(user.email, otp)

    return {
        "message": f"A new verification OTP has been sent to {user.email}.",
        "dev_otp": otp
    }



# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):

    email = data.email

    # 1. Find user

    user = db.query(User).filter(
        User.email == email
    ).first()

    # 2. Don't reveal whether email exists

    if not user:
        return {
            "message": (
                "If the email exists, "
                "a password reset OTP has been sent."
            )
        }

    # 3. Generate OTP

    otp = generate_otp()

    # 4. OTP expires after 5 minutes

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=5)
    )

    # 5. Create password reset OTP

    reset_otp = EmailVerificationOTP(
        user_id=user.id,
        otp=otp,
        purpose="password_reset",
        expires_at=expires_at
    )

    db.add(reset_otp)

    # 6. Save OTP

    db.commit()

    # 7. Send password reset email

    send_password_reset_email(
        user.email,
        otp
    )

    return {
        "message": (
            "If the email exists, "
            "a password reset OTP has been sent."
        ),
        "dev_otp": otp
    }



# =========================================================
# VERIFY PASSWORD RESET OTP
# =========================================================

@router.post("/verify-reset-otp")
def verify_reset_otp(
    data: OTPVerify,
    db: Session = Depends(get_db)
):

    # 1. Find user

    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    # 2. Find latest PASSWORD RESET OTP

    reset_otp = (
        db.query(EmailVerificationOTP)
        .filter(
            EmailVerificationOTP.user_id == user.id,
            EmailVerificationOTP.purpose == "password_reset"
        )
        .order_by(
            EmailVerificationOTP.created_at.desc()
        )
        .first()
    )

    if not reset_otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    # 3. Check expiration

    if datetime.now(timezone.utc) > reset_otp.expires_at:

        db.delete(reset_otp)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    # 4. Check OTP

    if reset_otp.otp != data.otp:

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    # =====================================================
    # OTP IS VALID
    # =====================================================

    # 5. Generate secure reset token

    reset_token = secrets.token_urlsafe(32)

    # 6. Save reset token to user

    user.password_reset_token = reset_token

    # 7. Reset token expires after 10 minutes

    user.password_reset_expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=10)
    )

    # 8. Delete OTP so it cannot be reused

    db.delete(reset_otp)

    # 9. Save changes

    db.commit()

    return {
        "message": "OTP verified successfully",
        "reset_token": reset_token
    }


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    data: ResetPassword,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset request"
        )

    if user.password_reset_token != data.reset_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    if (
        not user.password_reset_expires_at
        or datetime.now(timezone.utc)
        > user.password_reset_expires_at
    ):
        user.password_reset_token = None
        user.password_reset_expires_at = None

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Reset token has expired"
        )

    user.hashed_password = hash_password(
        data.new_password
    )

    user.password_reset_token = None
    user.password_reset_expires_at = None

    db.commit()

    return {
        "message": "Password reset successfully"
    }