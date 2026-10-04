<div align="center">

# ⚡ HookRelay

### Enterprise Webhook Infrastructure, Dispatch & Observability Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.142-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?style=flat&logo=python&logoColor=white)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Render-Live-46E3B7.svg?style=flat&logo=render&logoColor=black)](https://hookrelay-oebx.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[🌐 Live Demo](https://hookrelay-oebx.onrender.com)** • **[📖 API Docs (Swagger)](https://hookrelay-oebx.onrender.com/docs)** • **[🚀 Deploy Guide](DEPLOYMENT.md)**

</div>

---

## 📌 Overview

**HookRelay** is an enterprise-grade outbound webhook infrastructure and delivery management platform. It sits between your core application backend and your customers' webhook listeners, handling cryptographic request signing, resilient retries, delivery tracking, and deep audit logging with millisecond latency.

Built with **FastAPI**, **SQLAlchemy 2**, **PostgreSQL**, and an ultra-clean **Midnight Onyx** developer console.

---

## ✨ Features

- 🔒 **Cryptographic HMAC-SHA256 Signing**: Every outgoing webhook request is signed with a unique per-endpoint secret (`X-HookRelay-Signature`) using deterministic canonical JSON serialization to prevent tampering and replay attacks.
- 🔁 **Resilient Delivery & Exponential Backoff**: Automatic retry pipelines for failed HTTP responses or transient network disconnects, plus manual one-click delivery replays from the UI.
- 📊 **Complete Observability & Audit Logs**: Detailed tracking of HTTP status codes, request/response headers, execution latencies, attempt counts, and formatted JSON payloads.
- 🛡️ **Hardened Developer Authentication**: Argon2id password hashing, JWT Bearer sessions, multi-factor Email OTP verification (powered by free Gmail SMTP / Resend), and self-service password reset.
- ⚡ **Zero-Lag Event Ingestion**: Asynchronous background dispatch pipeline capable of receiving thousands of events without blocking publisher threads.
- 🎨 **Bespoke Developer Console**: Responsive dark-mode dashboard with real-time search, delivery status pills, secret reveal/rotation modals, and a built-in webhook testing receiver.
- 🐳 **100% Production Ready**: Multi-stage Docker containers, Alembic automatic migrations, and 1-click cloud deployment blueprints for Render and Railway.

---

## 🏗️ Architecture

```mermaid
sequenceDiagram
    autonumber
    actor App as Your Application
    participant HR as HookRelay Engine
    participant DB as PostgreSQL DB
    participant Recv as Webhook Receiver

    App->>HR: POST /events/{webhook_id} (Payload)
    HR->>DB: Fetch Endpoint URL & Secret
    HR->>HR: Compute HMAC-SHA256 (Canonical JSON)
    HR-->>App: 202 Accepted (event queued)
    HR->>Recv: POST target_url with X-HookRelay-Signature
    alt Receiver returns 2xx
        Recv-->>HR: 200 OK
        HR->>DB: Record Delivery (Status: success)
    else Receiver returns 4xx/5xx or timeout
        Recv-->>HR: Error / Timeout
        HR->>DB: Record Delivery (Status: failed, attempt: 1)
        HR->>HR: Schedule Exponential Backoff Retry
    end
```

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com) | Async ASGI web framework with high performance |
| **Database ORM** | [SQLAlchemy 2.x](https://www.sqlalchemy.org/) | Modern mapped database models & connection pooling |
| **DB Driver** | [psycopg 3.x](https://www.psycopg.org/psycopg3/) | Next-generation Python PostgreSQL adapter |
| **Migrations** | [Alembic](https://alembic.sqlalchemy.org/) | Automated, version-controlled schema migrations |
| **Security** | [PyJWT](https://pyjwt.readthedocs.io/) & [Argon2id](https://github.com/pypa/argon2-cffi) | Industry standard auth & password hashing |
| **Email Service** | `smtplib` + Gmail / Resend | Free global OTP verification delivery |
| **Frontend** | Vanilla HTML5 / CSS3 / ES6+ | Zero-dependency, ultra-fast developer UI |
| **Deployment** | Docker & Render Blueprint | Containerized deployment with automated migrations |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+ (or Docker)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/sanjayjujjuri28/hookrelay.git
cd hookrelay
```

### 2. Set Up Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env
```
Edit `.env` and provide your database and email credentials:
```ini
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/hookrelay
JWT_SECRET_KEY=generate_a_secure_32_byte_hex_string
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_google_app_password
```

### 4. Run Database Migrations
```bash
alembic upgrade head
```

### 5. Launch Local Server
```bash
uvicorn app.main:app --reload --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 🐳 Running with Docker

Run the complete stack (PostgreSQL + FastAPI Web Console) with a single command:

```bash
docker compose up -d --build
```
Access the dashboard at `http://localhost:8000`.

---

## 📡 API Reference

### 🔐 Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new developer account |
| `POST` | `/auth/verify-email` | Verify registration with 6-digit OTP |
| `POST` | `/auth/resend-otp` | Resend verification code |
| `POST` | `/auth/login` | Authenticate and obtain JWT Bearer token |
| `GET` | `/auth/me` | Fetch current authenticated user profile |
| `POST` | `/auth/forgot-password` | Request password reset OTP |
| `POST` | `/auth/reset-password` | Reset password using verified token |

### ◈ Webhook Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/webhooks/` | List all webhooks for current user |
| `POST` | `/webhooks/` | Create a new webhook destination endpoint |
| `GET` | `/webhooks/{id}` | Retrieve webhook details and signing secret |
| `PUT` | `/webhooks/{id}` | Update webhook endpoint name or target URL |
| `DELETE` | `/webhooks/{id}` | Cascade-delete webhook and delivery logs |
| `POST` | `/webhooks/{id}/rotate-secret` | Generate a new cryptographically secure secret |

### ⚡ Event Dispatch & Deliveries

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/events/{webhook_id}` | Dispatch an event payload to a webhook |
| `GET` | `/deliveries/` | Paginated delivery logs with status filtering |
| `GET` | `/deliveries/{id}` | Inspect full request headers, payload, & response |
| `POST` | `/deliveries/{id}/retry` | Re-trigger an existing delivery attempt |
| `POST` | `/test-receiver` | Built-in test listener verifying HMAC signatures |

---

## 🔐 Verifying Webhook Signatures

Receivers verify signatures by calculating the SHA256 HMAC of the raw canonical request body using the webhook secret:

### Python Receiver Example
```python
import hmac
import hashlib
import json
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = "whsec_YOUR_SECRET_KEY"

@app.post("/webhook")
async def handle_webhook(request: Request):
    signature_header = request.headers.get("X-HookRelay-Signature")
    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing signature header")

    body_bytes = await request.body()
    
    # Calculate expected signature
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature_header, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(body_bytes)
    print(f"Verified event received: {payload.get('event')}")
    return {"status": "ok"}
```

---

## ☁️ Cloud Deployment

Detailed step-by-step instructions for 100% free hosting are documented in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### 1-Click Render Deploy
1. Push this repository to GitHub.
2. Go to **Render Dashboard** &rarr; **New +** &rarr; **Blueprint**.
3. Select your repository. Render automatically provisions the PostgreSQL database and FastAPI service defined in `render.yaml`.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.