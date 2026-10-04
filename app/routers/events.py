from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Webhook, WebhookDelivery
from app.services.delivery_worker import process_delivery


router = APIRouter(
    prefix="/events",
    tags=["Events"]
)


@router.post("/{webhook_id}")
async def receive_event(
    webhook_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    # ==========================================
    # 1. FIND THE WEBHOOK
    # ==========================================

    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.is_active == True
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=404,
            detail="Webhook not found"
        )


    # ==========================================
    # 2. READ INCOMING PAYLOAD
    # ==========================================

    try:
        payload = await request.json()
    except Exception:
        payload = None

    if not payload:
        from datetime import datetime, timezone
        payload = {
            "event": "hookrelay.ping",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "message": f"Test event for webhook '{webhook.name}'",
                "webhook_id": webhook.id
            }
        }

    # ==========================================
    # 3. CREATE DELIVERY RECORD
    # ==========================================

    delivery = WebhookDelivery(
        webhook_id=webhook.id,
        event_payload=payload,
        status="pending",
        attempt_number=0
    )

    db.add(delivery)
    db.commit()
    db.refresh(delivery)



    # ==========================================
    # 4. START BACKGROUND DELIVERY
    # ==========================================

    background_tasks.add_task(
        process_delivery,
        delivery.id
    )


    # ==========================================
    # 5. RETURN IMMEDIATELY
    # ==========================================

    return {
        "message": "Webhook queued for delivery",
        "webhook_id": webhook.id,
        "delivery_id": delivery.id,
        "status": "pending"
    }