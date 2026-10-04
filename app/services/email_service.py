import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import resend
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# SMTP CONFIGURATION (Gmail, Brevo, or custom SMTP)
# Set SMTP_USER & SMTP_PASSWORD in .env to send to ANY email for free
# =========================================================
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
if SMTP_PASSWORD:
    SMTP_PASSWORD = SMTP_PASSWORD.replace(" ", "").strip()
if SMTP_USER:
    SMTP_USER = SMTP_USER.strip()

# Resend API Key & Testing fallback email
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY
VERIFIED_OWNER_EMAIL = "sanjayjujjuri2028@gmail.com"


def send_via_smtp(to_email: str, subject: str, html_content: str):
    """
    Sends email via standard SMTP (e.g. Gmail App Password).
    Free, no domain required, works for any recipient address worldwide.
    """
    msg = MIMEMultipart("alternative")
    msg["From"] = f"HookRelay <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    part = MIMEText(html_content, "html")
    msg.attach(part)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [to_email], msg.as_string())

    print(f"[EMAIL SERVICE] Successfully sent email to {to_email} via SMTP ({SMTP_HOST})")
    return True


def send_verification_email(to_email: str, otp: str):
    print("\n" + "=" * 50)
    print(f"[AUTH EMAIL] Verification OTP for {to_email}: {otp}")
    print("=" * 50 + "\n")

    subject = f"HookRelay - Verify Your Email ({otp})"
    html_content = f"""
    <h2>Welcome to HookRelay 🚀</h2>
    <p>Your email verification OTP is:</p>
    <h1 style="color:#7c5cff; letter-spacing:4px; font-size:32px;">{otp}</h1>
    <p>This OTP will expire in <strong>5 minutes</strong>.</p>
    <p>If you did not create a HookRelay account, you can ignore this email.</p>
    """

    # 1. Try sending via SMTP if configured (100% Free, sends to ANY recipient!)
    if SMTP_USER and SMTP_PASSWORD:
        try:
            return send_via_smtp(to_email, subject, html_content)
        except Exception as e:
            print(f"[EMAIL SERVICE] SMTP send failed: {e}. Falling back to Resend...")

    # 2. Try sending directly to recipient via Resend API
    try:
        params = {
            "from": "onboarding@resend.dev",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        return resend.Emails.send(params)
    except Exception as e:
        print(f"[EMAIL SERVICE] Resend direct send to {to_email} blocked: {e}")

        # 3. Resend testing mode fallback: forward OTP to verified owner inbox
        if to_email.lower() != VERIFIED_OWNER_EMAIL.lower():
            try:
                fallback_params = {
                    "from": "onboarding@resend.dev",
                    "to": [VERIFIED_OWNER_EMAIL],
                    "subject": f"[HookRelay OTP] Verification for {to_email}: {otp}",
                    "html": f"""
                    <h2>HookRelay Verification OTP</h2>
                    <p>New registration request for: <strong>{to_email}</strong></p>
                    <p>Verification Code:</p>
                    <h1 style="color:#7c5cff; letter-spacing:4px; font-size:32px;">{otp}</h1>
                    <p>This OTP will expire in <strong>5 minutes</strong>.</p>
                    """
                }
                print(f"[EMAIL SERVICE] Forwarded verification OTP to verified owner: {VERIFIED_OWNER_EMAIL}")
                return resend.Emails.send(fallback_params)
            except Exception as fb_err:
                print(f"[EMAIL SERVICE] Fallback forward failed: {fb_err}")
        return None


def send_password_reset_email(to_email: str, otp: str):
    print("\n" + "=" * 50)
    print(f"[AUTH EMAIL] Password Reset OTP for {to_email}: {otp}")
    print("=" * 50 + "\n")

    subject = f"HookRelay - Password Reset OTP ({otp})"
    html_content = f"""
    <h2>HookRelay Password Reset</h2>
    <p>Your password reset OTP is:</p>
    <h1 style="color:#7c5cff; letter-spacing:4px; font-size:32px;">{otp}</h1>
    <p>This OTP will expire in <strong>5 minutes</strong>.</p>
    <p>If you did not request a password reset, ignore this email.</p>
    """

    # 1. Try sending via SMTP if configured
    if SMTP_USER and SMTP_PASSWORD:
        try:
            return send_via_smtp(to_email, subject, html_content)
        except Exception as e:
            print(f"[EMAIL SERVICE] SMTP send failed: {e}. Falling back to Resend...")

    # 2. Resend API attempt
    try:
        params = {
            "from": "onboarding@resend.dev",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        return resend.Emails.send(params)
    except Exception as e:
        print(f"[EMAIL SERVICE] Resend direct send to {to_email} blocked: {e}")

        # 3. Resend testing mode fallback: forward OTP to verified owner inbox
        if to_email.lower() != VERIFIED_OWNER_EMAIL.lower():
            try:
                fallback_params = {
                    "from": "onboarding@resend.dev",
                    "to": [VERIFIED_OWNER_EMAIL],
                    "subject": f"[HookRelay OTP] Password Reset for {to_email}: {otp}",
                    "html": f"""
                    <h2>HookRelay Password Reset OTP</h2>
                    <p>Password reset requested for: <strong>{to_email}</strong></p>
                    <p>Reset OTP Code:</p>
                    <h1 style="color:#7c5cff; letter-spacing:4px; font-size:32px;">{otp}</h1>
                    <p>This OTP will expire in <strong>5 minutes</strong>.</p>
                    """
                }
                print(f"[EMAIL SERVICE] Forwarded reset OTP to verified owner: {VERIFIED_OWNER_EMAIL}")
                return resend.Emails.send(fallback_params)
            except Exception as fb_err:
                print(f"[EMAIL SERVICE] Fallback forward failed: {fb_err}")
        return None