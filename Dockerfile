# Production Dockerfile for HookRelay Webhook Platform
FROM python:3.12-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY alembic.ini .
COPY alembic/ alembic/
COPY app/ app/
COPY frontend/ frontend/
COPY start.sh .

# Ensure start script has executable permissions
RUN chmod +x start.sh

# Expose default HTTP port
EXPOSE 8000

# Start application
CMD ["./start.sh"]
