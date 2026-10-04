import asyncio
import httpx

from app.database import SessionLocal
from app.models import Webhook, WebhookDelivery
from app.services.webhook_service import deliver_webhook


MAX_ATTEMPTS = 3


async def process_delivery(
    delivery_id: int
):

    db = SessionLocal()

    try:

        # ==========================================
        # 1. FIND DELIVERY
        # ==========================================

        delivery = db.query(WebhookDelivery).filter(
            WebhookDelivery.id == delivery_id
        ).first()

        if not delivery:
            return


        # ==========================================
        # 2. FIND WEBHOOK
        # ==========================================

        webhook = db.query(Webhook).filter(
            Webhook.id == delivery.webhook_id
        ).first()

        if not webhook:

            delivery.status = "failed"
            delivery.error_message = "Webhook not found"

            db.commit()

            return


        # ==========================================
        # 3. GET PAYLOAD
        # ==========================================

        payload = delivery.event_payload


        # ==========================================
        # 4. RETRY LOOP
        # ==========================================

        for attempt in range(1, MAX_ATTEMPTS + 1):

            delivery.attempt_number = attempt
            delivery.status = "pending"

            db.commit()


            try:

                # ==================================
                # SEND WEBHOOK
                # ==================================

                response = await deliver_webhook(
                    target_url=webhook.target_url,
                    payload=payload,
                    secret=webhook.secret
                )


                # ==================================
                # SAVE RESPONSE
                # ==================================

                delivery.status_code = response.status_code


                # ==================================
                # SUCCESS
                # ==================================

                if 200 <= response.status_code < 300:

                    delivery.status = "success"
                    delivery.error_message = None

                    db.commit()

                    return


                # ==================================
                # HTTP FAILURE
                # ==================================

                delivery.status = "failed"

                delivery.error_message = (
                    f"Target returned HTTP {response.status_code}"
                )

                db.commit()


            # ======================================
            # TIMEOUT
            # ======================================

            except httpx.TimeoutException:

                delivery.status = "failed"
                delivery.status_code = None
                delivery.error_message = "Request timed out"

                db.commit()


            # ======================================
            # CONNECTION ERROR
            # ======================================

            except httpx.RequestError as e:

                delivery.status = "failed"
                delivery.status_code = None
                delivery.error_message = str(e)

                db.commit()


            # ======================================
            # WAIT BEFORE RETRY
            # ======================================

            if attempt < MAX_ATTEMPTS:

                wait_time = 2 ** attempt

                await asyncio.sleep(wait_time)


    finally:

        # ==========================================
        # CLOSE DATABASE SESSION
        # ==========================================

        db.close()