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

**HookRelay** is an enterprise-grade outbound webhook infrastructure and delivery management platform.

It sits between your core application backend and your customers' webhook listeners, handling:

- Cryptographic request signing
- Reliable webhook delivery
- Automatic retries
- Delivery tracking
- Request/response inspection
- Authentication and authorization
- Audit logging
- Webhook secret management

Built with **FastAPI**, **SQLAlchemy 2**, **PostgreSQL**, and a custom **Midnight Onyx** developer console.

---

## ✨ Features

- 🔒 **Cryptographic HMAC-SHA256 Signing**  
  Every outgoing webhook request is signed with a unique per-endpoint secret using the `X-HookRelay-Signature` header and deterministic JSON serialization.

- 🔁 **Resilient Delivery & Exponential Backoff**  
  Failed deliveries are automatically retried using an exponential backoff strategy. Developers can also manually replay deliveries from the dashboard.

- 📊 **Complete Observability & Audit Logs**  
  Track HTTP status codes, request/response headers, execution latency, attempt counts, payloads, and delivery status.

- 🛡️ **Hardened Developer Authentication**  
  Argon2id password hashing, JWT Bearer authentication, Email OTP verification, and self-service password recovery.

- ⚡ **Asynchronous Event Ingestion**  
  Events can be accepted and dispatched asynchronously without unnecessarily blocking the publisher.

- 🎨 **Developer Console**  
  A responsive dark-mode dashboard for webhook management, delivery inspection, secret rotation, searching, filtering, and testing.

- 🐳 **Production-Ready Infrastructure**  
  Docker, Docker Compose, Alembic migrations, Render Blueprint, Railway configuration, and production startup automation.

---

# 🏗️ Architecture

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
        HR->>DB: Record Delivery (Status: failed)
        HR->>HR: Schedule Exponential Backoff Retry
    end
```

---

# 📁 Project Structure

```text
hookrelay/
├── 📄 Dockerfile
├── 🐳 docker-compose.yml
├── ⚙️ alembic.ini
├── 📋 requirements.txt
├── 🚀 start.sh
├── ☁️ render.yaml
├── 🚂 railway.json
├── 📄 Procfile
├── 📚 README.md
├── 📖 DEPLOYMENT.md
├── 📜 LICENSE
│
├── 🗂️ app/
│   ├── 📄 main.py
│   ├── 🗄️ database.py
│   ├── 🧱 models.py
│   ├── 📐 schemas.py
│   ├── 🛡️ auth.py
│   ├── 🛠️ utils.py
│   │
│   ├── 🛣️ routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── webhooks.py
│   │   ├── events.py
│   │   └── deliveries.py
│   │
│   └── ⚙️ services/
│       ├── webhook_service.py
│       ├── delivery_worker.py
│       └── email_service.py
│
├── 🎨 frontend/
│   ├── 🌐 index.html
│   ├── 🔐 login.html
│   ├── 📝 register.html
│   ├── ✉️ verify.html
│   ├── 🔑 forgot-password.html
│   ├── 🔄 reset-password.html
│   ├── 📊 dashboard.html
│   │
│   ├── 🎯 css/
│   │   └── style.css
│   │
│   └── ⚡ js/
│       ├── api.js
│       ├── auth.js
│       └── dashboard.js
│
└── 🗄️ alembic/
    ├── env.py
    ├── script.py.mako
    └── 📜 versions/
        └── <migration scripts>
```

---

## 📂 Project Structure Explained

### Root Configuration

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage production container build |
| `docker-compose.yml` | Runs the FastAPI application and PostgreSQL together |
| `alembic.ini` | Alembic database migration configuration |
| `requirements.txt` | Python backend dependencies |
| `start.sh` | Container entrypoint and migration runner |
| `render.yaml` | Render Blueprint deployment configuration |
| `railway.json` | Railway deployment configuration |
| `Procfile` | Process declaration for PaaS environments |
| `README.md` | Project documentation |
| `DEPLOYMENT.md` | Production and cloud deployment guide |
| `LICENSE` | MIT open-source license |

### 🧠 Backend — `app/`

The `app/` package contains the core FastAPI application.

| File | Responsibility |
|---|---|
| `main.py` | FastAPI application entry point, middleware, static files, and router registration |
| `database.py` | SQLAlchemy engine, session factory, database connection and pooling |
| `models.py` | SQLAlchemy ORM models |
| `schemas.py` | Pydantic request/response schemas |
| `auth.py` | JWT authentication, password hashing, and security helpers |
| `utils.py` | HMAC-SHA256 signing and canonical JSON utilities |

### 🛣️ API Routers — `app/routers/`

| Router | Responsibility |
|---|---|
| `auth.py` | Registration, login, OTP verification, and password recovery |
| `webhooks.py` | Webhook creation, updates, deletion, and secret rotation |
| `events.py` | Event ingestion and webhook dispatch |
| `deliveries.py` | Delivery history, inspection, and manual retries |

### ⚙️ Services — `app/services/`

| Service | Responsibility |
|---|---|
| `webhook_service.py` | HTTP delivery, request signing, and webhook communication |
| `delivery_worker.py` | Retry processing and exponential backoff |
| `email_service.py` | SMTP/email OTP delivery |

### 🎨 Frontend — `frontend/`

HookRelay uses a lightweight **Vanilla HTML/CSS/JavaScript** developer console without a frontend framework.

| File | Responsibility |
|---|---|
| `index.html` | Landing page and navigation |
| `login.html` | Developer login |
| `register.html` | Developer registration |
| `verify.html` | Six-digit Email OTP verification |
| `forgot-password.html` | Password recovery request |
| `reset-password.html` | Password reset |
| `dashboard.html` | Developer management console |
| `css/style.css` | Dark-mode design system and UI styling |
| `js/api.js` | Centralized API client and authentication handling |
| `js/auth.js` | Authentication state and forms |
| `js/dashboard.js` | Webhook management, delivery inspection, charts, and dashboard interactions |

### 🗄️ Database Migrations — `alembic/`

Alembic provides version-controlled database schema migrations.

| File | Responsibility |
|---|---|
| `env.py` | Alembic runtime configuration and model discovery |
| `script.py.mako` | Migration file template |
| `versions/` | Individual database migration revisions |

---

# 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com) | High-performance Python ASGI framework |
| **Programming Language** | Python 3.12 | Backend application language |
| **Database ORM** | SQLAlchemy 2.x | Modern ORM and connection management |
| **Database** | PostgreSQL 16 | Relational production database |
| **DB Driver** | psycopg 3.x | PostgreSQL adapter for Python |
| **Migrations** | Alembic | Version-controlled database migrations |
| **Authentication** | JWT | Stateless Bearer authentication |
| **Password Hashing** | Argon2id | Secure password hashing |
| **Cryptographic Signing** | HMAC-SHA256 | Webhook request authentication |
| **Email Service** | SMTP / Gmail / Resend | OTP and authentication emails |
| **Frontend** | HTML5 / CSS3 / ES6+ | Lightweight developer console |
| **Containerization** | Docker | Production containerization |
| **Deployment** | Render / Railway | Cloud deployment platforms |

---

# 🚀 Quickstart

## Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Git
- Docker *(optional)*

---

## 1. Clone the Repository

```bash
git clone https://github.com/sanjayjujjuri28/hookrelay.git
cd hookrelay
```

---

## 2. Create a Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Configure Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Configure the required environment variables:

```ini
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/hookrelay

JWT_SECRET_KEY=generate_a_secure_32_byte_secret

SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_google_app_password
```

> ⚠️ Never commit `.env` or production credentials to GitHub.

---

## 5. Run Database Migrations

```bash
alembic upgrade head
```

---

## 6. Start the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

Open:

```text
http://localhost:8000
```

Swagger API documentation:

```text
http://localhost:8000/docs
```

---

# 🐳 Running with Docker

HookRelay can run the application and PostgreSQL database using Docker Compose.

```bash
docker compose up -d --build
```

Check running containers:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

Stop the stack:

```bash
docker compose down
```

The application will be available at:

```text
http://localhost:8000
```

---

# 📡 API Reference

## 🔐 Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new developer account |
| `POST` | `/auth/verify-email` | Verify registration using six-digit OTP |
| `POST` | `/auth/resend-otp` | Resend email verification OTP |
| `POST` | `/auth/login` | Authenticate and obtain JWT |
| `GET` | `/auth/me` | Fetch current authenticated user |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password |

---

## ◈ Webhook Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/webhooks/` | List current user's webhooks |
| `POST` | `/webhooks/` | Create a webhook destination |
| `GET` | `/webhooks/{id}` | Retrieve webhook details |
| `PUT` | `/webhooks/{id}` | Update webhook configuration |
| `DELETE` | `/webhooks/{id}` | Delete webhook and delivery logs |
| `POST` | `/webhooks/{id}/rotate-secret` | Rotate webhook signing secret |

---

## ⚡ Event Dispatch & Deliveries

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/events/{webhook_id}` | Dispatch an event |
| `GET` | `/deliveries/` | Retrieve delivery logs |
| `GET` | `/deliveries/{id}` | Inspect a delivery |
| `POST` | `/deliveries/{id}/retry` | Manually retry delivery |
| `POST` | `/test-receiver` | Test webhook receiver and signature |

---

# 🔐 Webhook Signature Verification

HookRelay signs outgoing webhook requests using **HMAC-SHA256**.

The receiver can verify that a webhook was genuinely sent by HookRelay by recalculating the signature using the shared webhook secret.

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

    signature_header = request.headers.get(
        "X-HookRelay-Signature"
    )

    if not signature_header:
        raise HTTPException(
            status_code=401,
            detail="Missing signature header"
        )

    body_bytes = await request.body()

    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(
        signature_header,
        expected
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid signature"
        )

    payload = json.loads(body_bytes)

    print(
        f"Verified event received: "
        f"{payload.get('event')}"
    )

    return {"status": "ok"}
```

---

# 🔄 Webhook Delivery Lifecycle

```text
                    ┌─────────────────────┐
                    │   Your Application  │
                    └──────────┬──────────┘
                               │
                               │ POST Event
                               ▼
                    ┌─────────────────────┐
                    │     HookRelay       │
                    │    Event API        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ PostgreSQL          │
                    │ Fetch URL + Secret  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ HMAC-SHA256 Signer  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Webhook Receiver    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                  2xx                  4xx/5xx
                    │                     │
                    ▼                     ▼
              ┌───────────┐      ┌───────────────┐
              │  Success  │      │ Retry Queue   │
              └─────┬─────┘      └───────┬───────┘
                    │                    │
                    ▼                    ▼
              ┌───────────┐      Exponential Backoff
              │ Delivery  │              │
              │   Logs    │◄─────────────┘
              └───────────┘
```

---

# 📊 Observability

Every webhook delivery can be inspected through the dashboard.

HookRelay records information such as:

- Delivery status
- HTTP status code
- Request headers
- Response headers
- Request payload
- Response body
- Attempt number
- Delivery latency
- Timestamp
- Retry history
- Target endpoint

This makes it possible to debug webhook failures without manually inspecting server logs.

---

# 🔁 Retry Strategy

Failed webhook deliveries can be retried automatically.

Typical flow:

```text
Attempt 1
   │
   ├── Success → Complete
   │
   └── Failure
          │
          ▼
     Backoff Delay
          │
          ▼
Attempt 2
   │
   ├── Success → Complete
   │
   └── Failure
          │
          ▼
     Backoff Delay
          │
          ▼
Attempt 3
   │
   ├── Success → Complete
   │
   └── Failure
          │
          ▼
      Final Failure
```

The dashboard also provides manual retry functionality for previously failed deliveries.

---

# 🎨 Developer Console

HookRelay includes a custom **Midnight Onyx** developer console built with:

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API
- Responsive layouts
- Glassmorphism-inspired UI
- Interactive status indicators
- Delivery inspection
- Webhook management
- Secret rotation
- Delivery analytics

No React, Vue, Angular, or other frontend framework is required.

---

# 🔐 Security

HookRelay implements multiple security mechanisms:

### Authentication

- JWT Bearer authentication
- Secure password hashing using Argon2id
- Email OTP verification
- Password recovery

### Webhook Security

- Per-webhook signing secrets
- HMAC-SHA256 signatures
- Constant-time signature comparison
- Canonical JSON serialization
- Secret rotation

### Infrastructure Security

- Environment-based secrets
- PostgreSQL
- Docker isolation
- Production configuration
- Database migrations

> Never expose production secrets, JWT keys, database passwords, or SMTP credentials in source control.

---

# ☁️ Cloud Deployment

HookRelay supports cloud deployment using:

- Render
- Railway
- Docker-based infrastructure

Detailed deployment instructions are available in:

**[DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 🌐 Live Deployment

**Production Application:**

https://hookrelay-oebx.onrender.com

**Developer Dashboard:**

https://hookrelay-oebx.onrender.com/dashboard.html

**Swagger API Documentation:**

https://hookrelay-oebx.onrender.com/docs

---

# 🚀 Render Deployment

HookRelay includes a `render.yaml` Blueprint configuration.

### Deployment Flow

```text
GitHub Repository
       │
       ▼
Render Blueprint
       │
       ├── PostgreSQL
       │
       └── FastAPI Service
                │
                ▼
        Automatic Deployment
                │
                ▼
        Alembic Migrations
                │
                ▼
        Production Application
```

Push the repository to GitHub and create a new Blueprint from the repository in Render.

---

# 🚂 Railway Deployment

HookRelay also contains:

```text
railway.json
```

for Railway-compatible deployment configuration.

---

# 🧪 Testing

Swagger UI is available at:

```text
/docs
```

You can also use tools such as:

- Postman
- cURL
- Browser
- Custom webhook receivers

Example:

```bash
curl -X POST \
  https://hookrelay-oebx.onrender.com/events/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "event": "order.created",
    "data": {
      "order_id": 12345
    }
  }'
```

---

# 📈 Future Improvements

Potential future improvements include:

- Redis-backed distributed job queues
- Celery / distributed workers
- WebSocket-based real-time delivery updates
- Rate limiting
- API keys
- Organization/team support
- Role-based access control
- Webhook analytics
- Dead-letter queues
- Delivery metrics
- Prometheus monitoring
- Grafana dashboards
- Horizontal worker scaling
- Event replay management
- Multi-region delivery infrastructure

---

# 🤝 Contributing

Contributions are welcome.

```bash
git clone https://github.com/sanjayjujjuri28/hookrelay.git
cd hookrelay

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Commit your changes:

```bash
git add .
git commit -m "feat: add your feature"
```

Push the branch:

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 📜 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

---

<div align="center">

## ⚡ Built with FastAPI • PostgreSQL • SQLAlchemy • Docker

### HookRelay — Reliable Webhook Infrastructure for Modern Applications

**[🌐 Live Demo](https://hookrelay-oebx.onrender.com)** • **[📖 API Docs](https://hookrelay-oebx.onrender.com/docs)** • **[⭐ GitHub](https://github.com/sanjayjujjuri28/hookrelay)**

</div>
