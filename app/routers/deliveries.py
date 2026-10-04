from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Webhook, WebhookDelivery, User
from app.auth import get_current_user
from app.services.webhook_service import deliver_webhook


router = APIRouter(
    prefix="/deliveries",
    tags=["Deliveries"]
)


# ==========================================
# GET MY DELIVERIES
# WITH PAGINATION + FILTERING
# ==========================================

@router.get("/")
def get_my_deliveries(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: str | None = Query(None),

    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    query = (
        db.query(
            WebhookDelivery,
            Webhook.name.label("webhook_name"),
            Webhook.target_url.label("target_url")
        )
        .join(Webhook, WebhookDelivery.webhook_id == Webhook.id)
        .filter(
            Webhook.user_id == current_user.id
        )
    )

    # ==========================================
    # FILTER BY STATUS
    # ==========================================

    if status:
        query = query.filter(
            WebhookDelivery.status == status
        )

    # ==========================================
    # TOTAL COUNT
    # ==========================================

    total = query.count()

    # ==========================================
    # PAGINATION
    # ==========================================

    offset = (page - 1) * limit

    rows = (
        query
        .order_by(
            WebhookDelivery.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    deliveries_list = []
    for d, webhook_name, target_url in rows:
        deliveries_list.append({
            "id": d.id,
            "webhook_id": d.webhook_id,
            "webhook_name": webhook_name,
            "target_url": target_url,
            "event_payload": d.event_payload,
            "status": d.status,
            "status_code": d.status_code,
            "attempt_number": d.attempt_number,
            "error_message": d.error_message,
            "created_at": d.created_at.isoformat() if d.created_at else None
        })

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "deliveries": deliveries_list
    }


# ==========================================
# GET SINGLE DELIVERY
# ==========================================

@router.get("/{delivery_id}")
def get_delivery(
    delivery_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    row = (
        db.query(
            WebhookDelivery,
            Webhook.name.label("webhook_name"),
            Webhook.target_url.label("target_url")
        )
        .join(Webhook, WebhookDelivery.webhook_id == Webhook.id)
        .filter(
            WebhookDelivery.id == delivery_id,
            Webhook.user_id == current_user.id
        )
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Delivery not found"
        )

    d, webhook_name, target_url = row
    return {
        "id": d.id,
        "webhook_id": d.webhook_id,
        "webhook_name": webhook_name,
        "target_url": target_url,
        "event_payload": d.event_payload,
        "status": d.status,
        "status_code": d.status_code,
        "attempt_number": d.attempt_number,
        "error_message": d.error_message,
        "created_at": d.created_at.isoformat() if d.created_at else None
    }
# ==========================================
# MANUAL RETRY DELIVERY
# ==========================================

@router.post("/{delivery_id}/retry")
async def retry_delivery(
    delivery_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # 1. Find delivery belonging to current user
    delivery = (
        db.query(WebhookDelivery)
        .join(Webhook)
        .filter(
            WebhookDelivery.id == delivery_id,
            Webhook.user_id == current_user.id
        )
        .first()
    )

    if not delivery:
        raise HTTPException(
            status_code=404,
            detail="Delivery not found"
        )

    # 2. Get webhook
    webhook = (
        db.query(Webhook)
        .filter(
            Webhook.id == delivery.webhook_id,
            Webhook.user_id == current_user.id
        )
        .first()
    )

    if not webhook:
        raise HTTPException(
            status_code=404,
            detail="Webhook not found"
        )

    # 3. Deliver again
    try:

        response = await deliver_webhook(
            target_url=webhook.target_url,
            payload=delivery.event_payload,
            secret=webhook.secret
        )

        # 4. Update delivery
        delivery.attempt_number += 1
        delivery.status_code = response.status_code

        if 200 <= response.status_code < 300:
            delivery.status = "success"
            delivery.error_message = None
        else:
            delivery.status = "failed"
            delivery.error_message = (
                f"HTTP {response.status_code}"
            )

        db.commit()
        db.refresh(delivery)

        return {
            "message": "Webhook retry completed",
            "delivery_id": delivery.id,
            "status": delivery.status,
            "status_code": delivery.status_code,
            "attempt_number": delivery.attempt_number
        }

    except Exception as e:

        delivery.attempt_number += 1
        delivery.status = "failed"
        delivery.status_code = None
        delivery.error_message = str(e)

        db.commit()
        db.refresh(delivery)

        return {
            "message": "Webhook retry failed",
            "delivery_id": delivery.id,
            "status": delivery.status,
            "status_code": None,
            "attempt_number": delivery.attempt_number,
            "error": delivery.error_message
        }