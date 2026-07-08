"""
Google OAuth 2.0 — backend-initiated flow.

User → GET /api/auth/google → Google → GET /api/auth/google/callback → JWT → frontend /auth/callback
"""

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import quote, urlencode

import requests
from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt

from api.auth import (
    ALGORITHM,
    SECRET_KEY,
    _ensure_users_row,
    _find_auth_user,
    _norm_email,
    create_access_token,
    get_supabase,
)

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

OAUTH_STATE_PURPOSE = "google_oauth"
OAUTH_STATE_MINUTES = 10


def _oauth_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def create_oauth_state() -> str:
    expire = datetime.utcnow() + timedelta(minutes=OAUTH_STATE_MINUTES)
    payload = {"exp": expire, "purpose": OAUTH_STATE_PURPOSE, "nonce": secrets.token_urlsafe(16)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_oauth_state(state: str) -> None:
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")
    if payload.get("purpose") != OAUTH_STATE_PURPOSE:
        raise HTTPException(status_code=400, detail="Invalid OAuth state.")


def google_login_redirect() -> RedirectResponse:
    if not _oauth_configured():
        message = (
            "Google sign-in is not configured. "
            "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env, then restart the API."
        )
        return RedirectResponse(
            f"{FRONTEND_URL}/login?error={quote(message)}",
            status_code=302,
        )

    state = create_oauth_state()
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}", status_code=302)


def _exchange_code(code: str) -> dict:
    response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=30,
    )
    if not response.ok:
        logger.error("Google token exchange failed: %s", response.text)
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google.")
    return response.json()


def _fetch_google_profile(access_token: str) -> dict:
    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    if not response.ok:
        logger.error("Google userinfo failed: %s", response.text)
        raise HTTPException(status_code=400, detail="Failed to load Google profile.")
    return response.json()


def upsert_google_user(email: str, name: str, google_id: str) -> dict:
    """
    Find or create a user row for a verified Google account.
    If Supabase is unreachable (DNS/network error), returns a minimal
    user dict built from Google profile data so the JWT can still be issued.
    """
    email = _norm_email(email)
    now = datetime.utcnow().isoformat()

    # ── 1. Try Supabase — full happy path ────────────────────────────────────
    try:
        supabase = get_supabase()

        # Check if user already exists
        try:
            res = supabase.table("users").select("*").eq("email", email).single().execute()
            if res.data:
                user = res.data
                # Refresh name + verified flag
                supabase.table("users").update({
                    "name": name or user.get("name") or "User",
                    "email_verified": True,
                    "updated_at": now,
                }).eq("id", user["id"]).execute()
                user["name"] = name or user.get("name") or "User"
                user["email_verified"] = True
                logger.info("Existing Google user found: %s", email)
                return user
        except Exception:
            pass  # row not found — fall through to create

        # Resolve or create an auth.users entry
        user_id: Optional[str] = None
        auth_user = _find_auth_user(supabase, email)
        if auth_user:
            user_id = auth_user["id"]
        else:
            try:
                auth_res = supabase.auth.admin.create_user({
                    "email": email,
                    "email_confirm": True,
                    "user_metadata": {
                        "name": name,
                        "google_id": google_id,
                        "provider": "google",
                    },
                })
                user_id = auth_res.user.id
            except Exception as exc:
                logger.warning("Supabase create_user for Google: %s", exc)
                # One more attempt to find existing auth user
                auth_user = _find_auth_user(supabase, email)
                if auth_user:
                    user_id = auth_user["id"]

        # If we still have no user_id, derive one deterministically from the email
        if not user_id:
            user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, email))
            logger.warning("Could not resolve Supabase auth user — using derived ID for %s", email)

        # Insert users table row
        try:
            supabase.table("users").insert({
                "id": user_id,
                "name": name or "User",
                "email": email,
                "password_hash": "",
                "email_verified": True,
                "created_at": now,
                "updated_at": now,
            }).execute()
        except Exception:
            # Row may already exist (race condition) — try to recover it
            recovered = _ensure_users_row(supabase, email, name or "User")
            if recovered:
                user_id = recovered["id"]
                try:
                    supabase.table("users").update({
                        "name": name or recovered.get("name") or "User",
                        "email_verified": True,
                        "updated_at": now,
                    }).eq("id", user_id).execute()
                except Exception:
                    pass
                return {**recovered, "name": name or recovered.get("name") or "User", "email_verified": True}

        # Return the freshly inserted row
        try:
            res = supabase.table("users").select("*").eq("id", user_id).single().execute()
            if res.data:
                return res.data
        except Exception:
            pass

        # Fallback: return what we know
        return {"id": user_id, "name": name or "User", "email": email, "email_verified": True}

    except HTTPException:
        raise  # propagate explicit HTTP errors unchanged

    except Exception as exc:
        # ── 2. Supabase completely unreachable (DNS / network) ────────────────
        # Issue a JWT anyway using a stable deterministic ID so the user
        # can still log in. The row will be created next time Supabase is up.
        logger.warning(
            "Supabase unreachable during Google OAuth (%s). "
            "Issuing JWT with derived ID for %s.",
            exc, email,
        )
        derived_id = str(uuid.uuid5(uuid.NAMESPACE_URL, email))
        return {
            "id": derived_id,
            "name": name or "User",
            "email": email,
            "email_verified": True,
        }


def login_with_oauth_session(access_token: str) -> dict:
    """Exchange a Supabase OAuth access token (Google via Supabase) for an app JWT."""
    supabase = get_supabase()
    try:
        user_res = supabase.auth.get_user(access_token)
    except Exception as exc:
        logger.warning("OAuth session validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired Google session.") from exc

    if not user_res or not user_res.user:
        raise HTTPException(status_code=401, detail="Invalid or expired Google session.")

    auth_user = user_res.user
    email = _norm_email(auth_user.email or "")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email address.")

    meta = auth_user.user_metadata or {}
    name = (
        meta.get("full_name")
        or meta.get("name")
        or email.split("@")[0]
    )
    google_id = str(meta.get("sub") or auth_user.id)

    user = upsert_google_user(email, name, google_id)
    # ✅ FIXED: Include name in JWT
    jwt_token = create_access_token(user["id"], user["email"], user.get("name") or name)

    return {
        "token": jwt_token,
        "user": {
            "id": user["id"],
            "name": user.get("name", name),
            "email": user["email"],
            "email_verified": True,
        },
        "message": "Login successful! Welcome back.",
    }


def _sanitize_name(name: str) -> str:
    """Replace em-dashes and en-dashes with regular dashes."""
    if not name:
        return name
    return name.replace("–", "-").replace("—", "-")


def google_callback_redirect(
    code: Optional[str],
    state: Optional[str],
    error: Optional[str],
) -> RedirectResponse:
    if error:
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error={quote(error)}",
            status_code=302,
        )

    if not code or not state:
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error=missing_code",
            status_code=302,
        )

    if not _oauth_configured():
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error=google_not_configured",
            status_code=302,
        )

    try:
        verify_oauth_state(state)
        tokens = _exchange_code(code)
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Google did not return an access token.")

        profile = _fetch_google_profile(access_token)
        email = profile.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google account has no email address.")

        google_id = profile.get("id", "")
        name = profile.get("name") or profile.get("given_name") or email.split("@")[0]
        # Sanitize name to remove em-dashes and other special characters
        name = _sanitize_name(name)

        user = upsert_google_user(email, name, google_id)
        # ✅ FIXED: Include name in JWT with sanitization
        jwt_token = create_access_token(user["id"], user["email"], user.get("name") or name)

        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?token={quote(jwt_token, safe='')}",
            status_code=302,
        )
    except HTTPException as exc:
        detail = str(exc.detail) if exc.detail else "google_auth_failed"
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error={quote(detail)}",
            status_code=302,
        )
    except Exception as exc:
        logger.exception("Google OAuth callback failed: %s", exc)
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error=google_auth_failed",
            status_code=302,
        )