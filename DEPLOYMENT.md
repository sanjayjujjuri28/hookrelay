# 🚀 HookRelay Production Deployment Guide

HookRelay is an enterprise-grade webhook infrastructure platform built with **FastAPI**, **SQLAlchemy**, **PostgreSQL**, and a modern **Vanilla JS/CSS** dashboard.

This guide provides step-by-step instructions to deploy HookRelay to the cloud for **100% free** using **Render**, **Railway**, or **Docker**.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:
1. **GitHub Repository**: Push this codebase to a GitHub repo (public or private).
2. **PostgreSQL Database**: Either cloud-hosted (Render, Supabase, Neon, Railway) or Docker container.
3. **JWT Secret Key**: A 32+ character random string (`python3 -c "import secrets; print(secrets.token_hex(32))"`).
4. **Gmail SMTP Credentials**:
   - `SMTP_USER`: Your Google email address (e.g., `you@gmail.com`).
   - `SMTP_PASSWORD`: 16-character Google App Password from [Google App Passwords](https://myaccount.google.com/apppasswords).

---

## 🌟 Option 1: Deploy on Render (Recommended — 100% Free)

Render provides free hosting for both Web Services and PostgreSQL.

### Method A: 1-Click Blueprint (Easiest)
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: HookRelay production deployment setup"
   git remote add origin https://github.com/your-username/hookrelay.git
   git push -u origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your `hookrelay` GitHub repository.
5. Render reads [render.yaml](file:///Users/sanjay/Documents/HookRelay/render.yaml) automatically and provisions:
   - **PostgreSQL Database** (`hookrelay-db`)
   - **FastAPI Web Service** (`hookrelay`)
6. Enter the two prompted environment variables:
   - `SMTP_USER`: Your Gmail address.
   - `SMTP_PASSWORD`: Your 16-character Google App Password.
7. Click **Apply**.
8. Render will run database migrations via `start.sh` (`alembic upgrade head`) and launch your application!

---

### Method B: Manual Render Setup
1. **Create PostgreSQL Database on Render**:
   - Click **New +** → **PostgreSQL**.
   - Name: `hookrelay-db`, Database: `hookrelay`, User: `hookrelay_user`.
   - Instance Type: **Free**.
   - Click **Create Database** and copy the **Internal Database URL** (or External if hosting separately).

2. **Create Web Service on Render**:
   - Click **New +** → **Web Service** → Connect your GitHub repo.
   - **Runtime**: `Python 3`.
   - **Build Command**: `pip install -r requirements.txt`.
   - **Start Command**: `bash start.sh`.
   - **Instance Type**: **Free**.

3. **Set Environment Variables in Render**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `<Your Render PostgreSQL URL>` | HookRelay automatically formats `postgres://` to `postgresql+psycopg://` |
   | `JWT_SECRET_KEY` | `64-character-hex-string` | Generated token key |
   | `SMTP_USER` | `your_email@gmail.com` | Sender email address |
   | `SMTP_PASSWORD` | `your_16_char_app_password` | Google App Password |
   | `PYTHON_VERSION` | `3.12.0` | Python runtime version |

4. Click **Deploy Web Service**. Your live URL will look like:
   `https://hookrelay.onrender.com`

---

## 🚆 Option 2: Deploy on Railway

Railway offers $5 free credits each month and automatic builds.

1. Go to [Railway Dashboard](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `hookrelay` repository.
4. Add a Database: Click **+ New** → **Database** → **Add PostgreSQL**.
5. Connect Database to Web Service:
   - Under the Web Service **Variables**, click **Add Reference** and select `DATABASE_URL` from PostgreSQL.
   - Add `JWT_SECRET_KEY`, `SMTP_USER`, and `SMTP_PASSWORD`.
6. Railway detects [railway.json](file:///Users/sanjay/Documents/HookRelay/railway.json) & [Procfile](file:///Users/sanjay/Documents/HookRelay/Procfile) and deploys automatically.
7. Generate a domain under **Settings** → **Networking** → **Generate Domain**.

---

## 🐘 Option 3: Serverless PostgreSQL (Neon or Supabase) + Any Web Host

If you prefer separating your database:
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Copy the connection string (e.g., `postgresql://user:pass@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require`).
3. Set that URL as `DATABASE_URL` on any web host (Render, Fly.io, Vercel, Railway).
4. HookRelay's connection pool includes `pool_pre_ping=True` and handles reconnection automatically.

---

## 🐳 Option 4: Self-Hosted Docker / VPS

For deploying to your own server (Ubuntu/Debian VPS, AWS EC2, DigitalOcean, Hetzner):

1. Clone repository to your server:
   ```bash
   git clone https://github.com/your-username/hookrelay.git
   cd hookrelay
   ```

2. Create `.env` file from [.env.example](file:///Users/sanjay/Documents/HookRelay/.env.example):
   ```bash
   cp .env.example .env
   nano .env
   ```

3. Run with Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Check logs:
   ```bash
   docker compose logs -f
   ```

5. The app will be running at `http://your-server-ip:8000`.

---

## 🔒 Post-Deployment Verification

Once deployed, verify all capabilities:
- [x] **Landing Page**: Visit `https://your-domain.com/` (loads hero, interactive tabs, feature grid).
- [x] **Health Check**: Visit `https://your-domain.com/api/health` (returns `{"status":"healthy"}`).
- [x] **Registration & OTP**: Create a new account at `/register.html`. Verify you receive the 6-digit OTP in your inbox and can verify your account.
- [x] **Dashboard**: Log in to `/dashboard.html`, create a webhook endpoint, copy its secret, and dispatch a test event via the **⚡ Send Test Event** modal.
- [x] **Delivery Inspection**: Click **Inspect** on the new delivery to see signature headers, payload JSON, and 2xx response status.
