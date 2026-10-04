from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Webhook

from app.routers.auth import router as auth_router
from app.routers.webhooks import router as webhook_router
from app.routers import events
from app.routers import deliveries

from fastapi.middleware.cors import CORSMiddleware

import hmac
import hashlib
import json


app = FastAPI()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# STATIC FILES
# =========================================================

app.mount(
    "/static",
    StaticFiles(directory="frontend"),
    name="static"
)


# =========================================================
# =========================================================
# ROOT & FRONTEND PAGES
# =========================================================

@app.api_route("/", methods=["GET", "HEAD"])
@app.api_route("/index.html", methods=["GET", "HEAD"])
def root_page():
    return FileResponse(
        "frontend/index.html"
    )


@app.api_route("/api/health", methods=["GET", "HEAD"])
def api_health():
    return {
        "status": "healthy",
        "service": "HookRelay API",
        "version": "1.0.0"
    }


@app.api_route("/login", methods=["GET", "HEAD"])
@app.api_route("/login.html", methods=["GET", "HEAD"])
def login_page():
    return FileResponse(
        "frontend/login.html"
    )


@app.api_route("/register", methods=["GET", "HEAD"])
@app.api_route("/register.html", methods=["GET", "HEAD"])
def register_page():
    return FileResponse(
        "frontend/register.html"
    )


@app.api_route("/verify", methods=["GET", "HEAD"])
@app.api_route("/verify.html", methods=["GET", "HEAD"])
def verify_page():
    return FileResponse(
        "frontend/verify.html"
    )


@app.api_route("/forgot-password", methods=["GET", "HEAD"])
@app.api_route("/forgot-password.html", methods=["GET", "HEAD"])
def forgot_password_page():
    return FileResponse(
        "frontend/forgot-password.html"
    )


@app.api_route("/reset-password", methods=["GET", "HEAD"])
@app.api_route("/reset-password.html", methods=["GET", "HEAD"])
def reset_password_page():
    return FileResponse(
        "frontend/reset-password.html"
    )


@app.api_route("/dashboard", methods=["GET", "HEAD"])
@app.api_route("/dashboard.html", methods=["GET", "HEAD"])
def dashboard_page():
    return FileResponse(
        "frontend/dashboard.html"
    )



# =========================================================
# DATABASE TEST
# =========================================================

@app.get("/db-test")
def db_test(
    db: Session = Depends(get_db)
):

    users = db.query(User).all()

    return users


# =========================================================
# TEST WEBHOOK RECEIVER
# =========================================================

@app.post("/test-receiver")
async def test_receiver(
    request: Request,
    webhook_id: int | None = None,
    secret: str | None = None,
    db: Session = Depends(get_db)
):

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    received_signature = request.headers.get(
        "X-HookRelay-Signature"
    )

    if not received_signature:
        raise HTTPException(
            status_code=401,
            detail="Missing webhook signature (X-HookRelay-Signature)"
        )

    # 1. Determine secret: query param > header > database lookup > fallback default
    target_secret = secret or request.headers.get("X-Webhook-Secret")
    if not target_secret and webhook_id:
        wh = db.query(Webhook).filter(Webhook.id == webhook_id).first()
        if wh:
            target_secret = wh.secret

    if not target_secret and isinstance(payload, dict):
        wid = payload.get("data", {}).get("webhook_id") or payload.get("webhook_id")
        if wid:
            try:
                wh = db.query(Webhook).filter(Webhook.id == int(wid)).first()
                if wh:
                    target_secret = wh.secret
            except Exception:
                pass

    if not target_secret:
        target_secret = "whsec_0LBP8MqdENiXHNMuwuTD-mV-gABw6vZgw0qouNmylQ4"

    payload_bytes = json.dumps(
        payload,
        separators=(",", ":"),
        sort_keys=True
    ).encode()

    expected_signature = (
        "sha256="
        + hmac.new(
            target_secret.encode(),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
    )

    if not hmac.compare_digest(
        received_signature,
        expected_signature
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid webhook signature"
        )

    print(
        f"[TEST RECEIVER] Signature verified successfully for secret '{target_secret[:12]}...'"
    )

    return {
        "status": "success",
        "message": "Webhook signature verified successfully",
        "payload": payload
    }



# =========================================================
# API ROUTERS
# =========================================================

app.include_router(
    auth_router
)

app.include_router(
    webhook_router
)

app.include_router(
    events.router
)

app.include_router(
    deliveries.router
)