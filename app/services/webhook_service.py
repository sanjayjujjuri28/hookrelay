import httpx
import hmac
import hashlib
import json


def generate_signature(
    payload: dict,
    secret: str
) -> str:

    payload_bytes = json.dumps(
        payload,
        separators=(",", ":"),
        sort_keys=True
    ).encode()

    signature = hmac.new(
        secret.encode(),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    return "sha256=" + signature


async def deliver_webhook(
    target_url: str,
    payload: dict,
    secret: str
):

    signature = generate_signature(
        payload,
        secret
    )

    headers = {
        "X-HookRelay-Signature": signature
    }

    async with httpx.AsyncClient() as client:

        response = await client.post(
            target_url,
            json=payload,
            headers=headers,
            timeout=10
        )

    return response