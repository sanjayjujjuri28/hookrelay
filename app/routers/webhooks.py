from fastapi import APIRouter, Depends,HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Webhook, User, WebhookDelivery

from app.schemas import (
    WebhookCreate,
    WebhookResponse,
    WebhookUpdate,
    WebhookCreateResponse
)

from app.auth import get_current_user
import secrets


router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"]
)


# ==========================================
# CREATE WEBHOOK
# ==========================================

@router.post(
    "/",
    response_model=WebhookCreateResponse
)
def create_webhook(
    webhook: WebhookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    webhook_secret = "whsec_" + secrets.token_urlsafe(32)
    new_webhook = Webhook(
    name=webhook.name,
    target_url=webhook.target_url,
    user_id=current_user.id,
    secret=webhook_secret
    )

    db.add(new_webhook)
    db.commit()
    db.refresh(new_webhook)

    return new_webhook


# ==========================================
# GET MY WEBHOOKS
# ==========================================

@router.get(
    "/",
    response_model=list[WebhookResponse]
)
def get_webhooks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    webhooks = db.query(Webhook).filter(
        Webhook.user_id == current_user.id
    ).all()

    return webhooks
#-----------------------------getonewebhook

@router.get(
    "/{webhook_id}",
    response_model=WebhookResponse
)
def get_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.user_id == current_user.id
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=404,
            detail="Webhook not found"
        )

    return webhook


#-----updating
@router.put(
    "/{webhook_id}",
    response_model=WebhookResponse
)
def update_webhook(
    webhook_id: int,
    webhook_data: WebhookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.user_id == current_user.id
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=404,
            detail="Webhook not found"
        )

    webhook.name = webhook_data.name
    webhook.target_url = webhook_data.target_url
    webhook.is_active = webhook_data.is_active

    db.commit()
    db.refresh(webhook)

    return webhook

#---delete webhook
@router.delete("/{webhook_id}")
def delete_webhook(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.user_id == current_user.id
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=404,
            detail="Webhook not found"
        )

    # Delete child delivery history first to avoid FK constraint issues
    db.query(WebhookDelivery).filter(
        WebhookDelivery.webhook_id == webhook_id
    ).delete(synchronize_session=False)

    db.delete(webhook)
    db.commit()

    return {
        "message": "Webhook deleted successfully"
    }
# ==========================================
# REGENERATE WEBHOOK SECRET
# ==========================================

@router.post("/{webhook_id}/regenerate-secret")
@router.post("/{webhook_id}/rotate-secret")
def regenerate_webhook_secret(
    webhook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.user_id == current_user.id
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=404,
            detail="Webhook not found"
        )

    # Generate new secret
    new_secret = "whsec_" + secrets.token_urlsafe(32)

    webhook.secret = new_secret

    db.commit()
    db.refresh(webhook)

    return {
        "message": "Webhook secret regenerated successfully",
        "webhook_id": webhook.id,
        "secret": new_secret
    }