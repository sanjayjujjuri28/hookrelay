#!/usr/bin/env bash
set -e

echo "=== [HookRelay] Starting Deployment Initialization ==="

# 1. Run Alembic Database Migrations
echo "=== [HookRelay] Running database migrations (alembic upgrade head)... ==="
alembic upgrade head

# 2. Bind port (default to 8000 if PORT not set by platform)
APP_PORT="${PORT:-8000}"
echo "=== [HookRelay] Starting Uvicorn on 0.0.0.0:${APP_PORT} ==="

# 3. Launch Uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT}"
