"""
Email utilities for FitCoach AI
Supports Gmail App Password via SMTP_EMAIL / SMTP_APP_PASSWORD
"""

import os
import smtplib
import ssl
import traceback
import logging
from pathlib import Path
from urllib.parse import quote
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime, timedelta
import secrets

# ── Load .env before reading any env vars ─────────────────────────────────────
from dotenv import load_dotenv
for _candidate in [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / "backend" / ".env",
    Path(".env"),
]:
    if _candidate.exists():
        load_dotenv(_candidate, override=False)
        break

logger = logging.getLogger("email_utils")
logging.basicConfig(level=logging.INFO)

# ── Email config — supports BOTH old and new env var names ────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

# Accept SMTP_EMAIL or SMTP_USER (whichever is set)
SMTP_USER     = (os.getenv("SMTP_EMAIL") or os.getenv("SMTP_USER", "")).strip()
# Accept SMTP_APP_PASSWORD or SMTP_PASSWORD (whichever is set)
SMTP_PASSWORD = (os.getenv("SMTP_APP_PASSWORD") or os.getenv("SMTP_PASSWORD", "")).strip()
# Remove spaces from app password (Google sometimes shows it with spaces)
SMTP_PASSWORD = SMTP_PASSWORD.replace(" ", "")

FROM_EMAIL   = os.getenv("FROM_EMAIL", SMTP_USER).strip()
FROM_NAME    = os.getenv("FROM_NAME", "FitCoach AI").strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", "15"))

# ── In-memory verification tokens ────────────────────────────────────────────
verification_tokens: dict = {}


# ── Token helpers ─────────────────────────────────────────────────────────────

def generate_verification_token(email: str) -> str:
    token   = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=24)
    verification_tokens[email.lower().strip()] = {
        "token": token, "expires": expires, "verified": False,
    }
    return token


def verify_email_token(email: str, token: str) -> bool:
    key = email.lower().strip()
    if key not in verification_tokens:
        return False
    data = verification_tokens[key]
    if data["token"] != token:
        return False
    if datetime.utcnow() > data["expires"]:
        verification_tokens.pop(key, None)
        return False
    data["verified"] = True
    return True


def is_email_verified(email: str) -> bool:
    data = verification_tokens.get(email.lower().strip())
    return bool(data and data.get("verified", False))


def invalidate_verification_token(email: str) -> None:
    verification_tokens.pop(email.lower().strip(), None)


# ── SMTP send ─────────────────────────────────────────────────────────────────

def _smtp_configured() -> bool:
    ok = bool(SMTP_USER and SMTP_PASSWORD)
    if not ok:
        logger.warning(
            "SMTP not configured. "
            "Set SMTP_EMAIL and SMTP_APP_PASSWORD in backend/.env. "
            "SMTP_USER resolved to: '%s', SMTP_PASSWORD length: %d",
            SMTP_USER, len(SMTP_PASSWORD),
        )
    return ok


def _send_message(msg: MIMEMultipart, to_email: str) -> bool:
    if not _smtp_configured():
        # Dev fallback — print to terminal so you can see the verification URL
        print(f"\n{'=' * 60}")
        print("DEVELOPMENT EMAIL (not actually sent):")
        print(f"To: {to_email}")
        print(f"Subject: {msg['Subject']}")
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                print("Body:")
                print(part.get_payload(decode=True).decode("utf-8", errors="replace"))
                break
        print(f"{'=' * 60}\n")
        return True   # return True so registration doesn't fail

    try:
        logger.info("Sending email to %s via %s:%s as %s", to_email, SMTP_HOST, SMTP_PORT, SMTP_USER)

        if SMTP_PORT == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT, context=ctx) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)

        logger.info("✅ Email sent successfully to %s", to_email)
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(
            "❌ SMTP authentication failed for %s. "
            "Make sure you're using a Gmail App Password (16 chars, no spaces), "
            "not your normal Gmail password. "
            "Generate one at: https://myaccount.google.com/apppasswords — "
            "Raw error: %s", SMTP_USER, e,
        )
        return False

    except smtplib.SMTPConnectError as e:
        logger.error("❌ Cannot connect to SMTP %s:%s — %s", SMTP_HOST, SMTP_PORT, e)
        return False

    except (TimeoutError, OSError) as e:
        logger.error("❌ Network error to %s:%s — %s", SMTP_HOST, SMTP_PORT, e)
        return False

    except Exception as e:
        logger.error("❌ Unexpected error sending email to %s: %s", to_email, e)
        traceback.print_exc()
        return False


# ── Public senders ────────────────────────────────────────────────────────────

def send_verification_email(email: str, name: str, token: str) -> bool:
    safe_email       = quote(email, safe="")
    safe_token       = quote(token, safe="")
    verification_url = f"{FRONTEND_URL}/verify-email?email={safe_email}&token={safe_token}"

    msg            = MIMEMultipart("alternative")
    msg["Subject"] = "Verify Your FitCoach AI Email"
    msg["From"]    = formataddr((FROM_NAME, FROM_EMAIL or SMTP_USER or "noreply@localhost"))
    msg["To"]      = email

    text = f"""Hi {name},

Thank you for signing up for FitCoach AI!

Click the link below to verify your email address:
{verification_url}

This link expires in 24 hours.

If you didn't create this account, ignore this email.

— FitCoach AI Team
"""

    html = f"""\
<html><body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:30px 20px;">
  <div style="text-align:center;margin-bottom:30px;">
    <h1 style="color:#10b981;margin:0;">🏋️ FitCoach AI</h1>
    <p style="color:#666;margin-top:5px;">Your personal fitness coach</p>
  </div>
  <div style="background:#f9fafb;padding:30px;border-radius:12px;border-left:4px solid #10b981;">
    <h2 style="color:#1f2937;margin-top:0;">Welcome, {name}! 👋</h2>
    <p style="color:#374151;">Thanks for signing up. Click the button below to verify your email and start your fitness journey.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="{verification_url}"
         style="background:#10b981;color:white;padding:14px 36px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold;font-size:16px;">
        ✓ Verify Email Address
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;">Or copy this link into your browser:</p>
    <p style="background:white;padding:10px;border-radius:6px;word-break:break-all;color:#0066cc;font-size:12px;border:1px solid #e5e7eb;">
      {verification_url}
    </p>
    <p style="color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;padding-top:15px;margin-top:20px;">
      This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.
    </p>
  </div>
  <p style="text-align:center;color:#d1d5db;font-size:11px;margin-top:20px;">© 2026 FitCoach AI</p>
</div>
</body></html>
"""

    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))
    return _send_message(msg, email)


def send_password_reset_email(email: str, name: str, reset_token: str) -> bool:
    safe_token = quote(reset_token, safe="")
    reset_url  = f"{FRONTEND_URL}/reset-password?token={safe_token}"

    msg            = MIMEMultipart("alternative")
    msg["Subject"] = "Reset Your FitCoach AI Password"
    msg["From"]    = formataddr((FROM_NAME, FROM_EMAIL or SMTP_USER or "noreply@localhost"))
    msg["To"]      = email

    text = f"""Hi {name},

We received a request to reset your FitCoach AI password.

Click the link below to set a new password:
{reset_url}

This link expires in 1 hour. If you didn't request this, ignore this email.

— FitCoach AI Team
"""

    html = f"""\
<html><body style="font-family:Arial,sans-serif;color:#333;">
<div style="max-width:600px;margin:0 auto;padding:30px 20px;">
  <div style="text-align:center;margin-bottom:30px;">
    <h1 style="color:#10b981;margin:0;">🏋️ FitCoach AI</h1>
  </div>
  <div style="background:#f9fafb;padding:30px;border-radius:12px;border-left:4px solid #f59e0b;">
    <h2 style="color:#1f2937;margin-top:0;">Reset Your Password</h2>
    <p>We received a request to reset your password.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="{reset_url}"
         style="background:#10b981;color:white;padding:14px 36px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold;">
        Reset Password
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour.</p>
    <p style="color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;padding-top:15px;">
      If you didn't request this, your password remains unchanged.
    </p>
  </div>
</div>
</body></html>
"""

    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))
    return _send_message(msg, email)