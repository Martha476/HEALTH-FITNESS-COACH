"""
Authentication module — FitCoach AI
"""

__all__ = [
    'RegisterRequest', 'LoginRequest', 'AuthResponse', 'UserResponse',
    'UpdatePasswordRequest', 'ForgotPasswordRequest', 'ResetPasswordRequest',
    'DeleteAccountRequest', 'SendVerificationEmailRequest', 'VerifyEmailRequest',
    'VerifyEmailResponse', 'ResendVerificationEmailRequest',
    'register_user', 'login_user', 'update_password',
    'forgot_password', 'reset_password', 'delete_account',
    'send_verification_email', 'verify_email', 'resend_verification_email',
    'get_current_user', 'logout_user'
]

import os
import re
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import secrets
import requests
from fastapi import Request
from fastapi.responses import RedirectResponse

from dotenv import load_dotenv
for _candidate in [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / "backend" / ".env",
    Path(".env"),
]:
    if _candidate.exists():
        load_dotenv(_candidate, override=False)
        break

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from supabase import create_client, Client

from api.email_utils import (
    generate_verification_token,
    send_verification_email as send_verification_email_util,
    verify_email_token,
    is_email_verified,
    invalidate_verification_token,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.",
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

SECRET_KEY                  = os.getenv("JWT_SECRET_KEY", "fitness-coach-secret-key-change-in-production")
ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Google OAuth Configuration
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

# Frontend URL — used to build redirect links back to the SPA after auth.
# Reads from the environment so production (Vercel) and local dev (localhost:3000)
# both work correctly without code changes.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

security = HTTPBearer(auto_error=False)

failed_attempts: dict = {}
token_blacklist:  set = set()
MAX_FAILED_ATTEMPTS = 5


def _norm_email(email: str) -> str:
    return (email or "").lower().strip()


def _find_auth_user(supabase: Client, email: str) -> Optional[dict]:
    """Look up a user in Supabase Auth by email. Returns dict or None."""
    try:
        listing    = supabase.auth.admin.list_users()
        candidates = listing.users if hasattr(listing, "users") else listing
        match = next(
            (u for u in candidates if (getattr(u, "email", "") or "").lower() == email),
            None,
        )
        if match:
            return {"id": match.id, "email": email}
    except Exception as e:
        logger.warning("Could not list auth users: %s", e)
    return None


def _ensure_users_row(supabase: Client, email: str, name: str = "User") -> Optional[dict]:
    """
    Make sure a row exists in the users table.
    If missing, recover it from Supabase Auth.
    Returns the users table row or None if irrecoverable.
    """
    try:
        res = supabase.table("users").select("*").eq("email", email).single().execute()
        if res.data:
            return res.data
    except Exception:
        pass

    # Row missing — try to recover from auth
    auth_user = _find_auth_user(supabase, email)
    if not auth_user:
        return None

    now = datetime.utcnow().isoformat()
    try:
        supabase.table("users").insert({
            "id":             auth_user["id"],
            "name":           name,
            "email":          email,
            "password_hash":  "",          # no hash — user must reset password
            "email_verified": False,
            "created_at":     now,
            "updated_at":     now,
        }).execute()
        logger.info("Auto-recovered missing users row for %s", email)
        res = supabase.table("users").select("*").eq("email", email).single().execute()
        return res.data
    except Exception as e:
        logger.error("Failed to recover users row for %s: %s", email, e)
        return None


# ═════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name:     str = Field(min_length=2,  max_length=100)
    email:    str = Field(min_length=5,  max_length=100)
    password: str = Field(min_length=6,  max_length=128)

class LoginRequest(BaseModel):
    email:    str
    password: str

class AuthResponse(BaseModel):
    token:   str
    user:    dict
    message: str = "Success"

class UserResponse(BaseModel):
    id:         str
    name:       str
    email:      str
    created_at: Optional[str] = None

class UpdatePasswordRequest(BaseModel):
    email:        str
    old_password: str
    new_password: str = Field(min_length=6, max_length=128)

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str = Field(min_length=6, max_length=128)

class DeleteAccountRequest(BaseModel):
    email:    str
    password: str

class SendVerificationEmailRequest(BaseModel):
    email: str
    name:  Optional[str] = None

class VerifyEmailRequest(BaseModel):
    email: str
    token: str

class VerifyEmailResponse(BaseModel):
    message:  str
    email:    str
    verified: bool

class ResendVerificationEmailRequest(BaseModel):
    email: str

class OAuthSessionRequest(BaseModel):
    access_token: str


# ═════════════════════════════════════════════════════════════════════════════
#  GOOGLE OAUTH ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/google/test")
async def google_test():
    """Test endpoint to verify Google OAuth is configured"""
    return {
        "google_configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "client_id": GOOGLE_CLIENT_ID[:20] + "..." if GOOGLE_CLIENT_ID else "missing",
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "message": "Google OAuth test endpoint working"
    }

@router.get("/google/config-check")
async def google_config_check():
    """Check what redirect URI your backend is using"""
    return {
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "client_id_prefix": GOOGLE_CLIENT_ID[:20] if GOOGLE_CLIENT_ID else "missing",
        "has_secret": bool(GOOGLE_CLIENT_SECRET),
        "full_redirect_uri": GOOGLE_REDIRECT_URI,
        "frontend_url": FRONTEND_URL,
    }

@router.get("/google")
async def google_login(request: Request):
    """Redirect to Google OAuth"""
    logger.info(f"=== Google Login Request Received ===")
    logger.info(f"GOOGLE_CLIENT_ID configured: {bool(GOOGLE_CLIENT_ID)}")
    logger.info(f"GOOGLE_CLIENT_SECRET configured: {bool(GOOGLE_CLIENT_SECRET)}")
    logger.info(f"GOOGLE_REDIRECT_URI: {GOOGLE_REDIRECT_URI}")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        logger.error("Google OAuth not configured - missing credentials")
        raise HTTPException(
            status_code=500, 
            detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env"
        )
    
    # Generate state parameter for CSRF protection
    state = secrets.token_urlsafe(32)
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    
    import urllib.parse
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    
    logger.info(f"Redirecting to Google OAuth URL: {auth_url[:200]}...")
    
    response = RedirectResponse(url=auth_url)
    response.set_cookie(key="oauth_state", value=state, max_age=600, httponly=True)
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str = None, 
    state: str = None, 
    error: str = None
):
    """Handle Google OAuth callback"""
    logger.info("=== GOOGLE CALLBACK HIT ===")
    logger.info(f"Full URL: {request.url}")
    logger.info(f"Code present: {bool(code)}")
    logger.info(f"Error: {error}")
    
    if error:
        logger.error(f"OAuth error from Google: {error}")
        frontend_url = f"{FRONTEND_URL}/auth/callback?error={error}"
        return RedirectResponse(url=frontend_url)
    
    if not code:
        logger.error("No code received in callback")
        frontend_url = f"{FRONTEND_URL}/auth/callback?error=No+authorization+code"
        return RedirectResponse(url=frontend_url)
    
    logger.info(f"Code received: {code[:50]}...")
    
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    
    logger.info("Exchanging code for tokens...")
    
    try:
        response = requests.post(token_url, data=data)
        logger.info(f"Token exchange response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            frontend_url = f"{FRONTEND_URL}/auth/callback?error=Token+exchange+failed"
            return RedirectResponse(url=frontend_url)
        
        tokens = response.json()
        logger.info("Token exchange successful")
        
        # Get user info
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        user_response = requests.get(userinfo_url, headers=headers)
        
        if user_response.status_code != 200:
            logger.error(f"User info failed: {user_response.text}")
            frontend_url = f"{FRONTEND_URL}/auth/callback?error=Failed+to+get+user+info"
            return RedirectResponse(url=frontend_url)
        
        google_user = user_response.json()
        email = google_user.get("email", "").lower()
        name = google_user.get("name", email.split("@")[0])
        logger.info(f"User authenticated: {email}")
        
        # Get or create user — don't crash if Supabase is unreachable
        import uuid
        user = None

        try:
            supabase = get_supabase()
            result = supabase.table("users").select("*").eq("email", email).execute()
            user = result.data[0] if result.data else None

            if not user:
                user_id = str(uuid.uuid4())
                now = datetime.utcnow().isoformat()
                supabase.table("users").insert({
                    "id": user_id,
                    "name": name,
                    "email": email,
                    "password_hash": "",
                    "email_verified": True,
                    "created_at": now,
                    "updated_at": now,
                }).execute()
                user = {"id": user_id, "name": name, "email": email}
                logger.info(f"Created new user in Supabase: {email}")
            else:
                if not user.get("email_verified"):
                    supabase.table("users").update({
                        "email_verified": True,
                        "updated_at": datetime.utcnow().isoformat(),
                    }).eq("id", user["id"]).execute()
                    user["email_verified"] = True

        except Exception as e:
            # Supabase unreachable (DNS/network error) — still issue JWT
            # Use uuid5 so the same email always gets the same ID
            logger.warning(f"Supabase unavailable, issuing JWT anyway: {e}")
            user = {
                "id": str(uuid.uuid5(uuid.NAMESPACE_URL, email)),
                "name": name,
                "email": email,
                "email_verified": True,
            }

        # Issue JWT and send user to frontend
        access_token = create_access_token(user["id"], user["email"])
        logger.info(f"JWT issued for {user['email']}")

        frontend_url = f"{FRONTEND_URL}/auth/callback?token={access_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        logger.error(f"Exception in callback: {str(e)}")
        import traceback
        traceback.print_exc()
        frontend_url = f"{FRONTEND_URL}/auth/callback?error={str(e)}"
        return RedirectResponse(url=frontend_url)


# ═════════════════════════════════════════════════════════════════════════════
#  PASSWORD HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    if not hashed or hashed == "$2b$12$placeholder" or hashed == "":
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False



# ═════════════════════════════════════════════════════════════════════════════
#  JWT HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def create_access_token(user_id: str, email: str, name: str = None) -> str:
    """
    Create a JWT access token for the user.
    Includes name in the payload for JWT fallback when Supabase is unreachable.
    Sanitizes name to remove special characters like em-dashes.
    """
    # Sanitize name - replace em-dash and en-dash with regular dash
    sanitized_name = name or email.split("@")[0]
    if sanitized_name:
        # Replace en-dash (–) and em-dash (—) with regular dash (-)
        sanitized_name = sanitized_name.replace("–", "-").replace("—", "-")
    
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "name": sanitized_name,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    Returns the payload if valid, raises HTTPException if invalid.
    """
    if token in token_blacklist:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalidated. Please login again.")
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid or expired token: {str(e)}")
# ═════════════════════════════════════════════════════════════════════════════
#  OAUTH SESSION ENDPOINT (Google Sign-In)
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/oauth/session")
async def oauth_session(request: OAuthSessionRequest):
    """
    Exchange Supabase OAuth access token for app JWT.
    This is called after Google Sign-In to create/verify user and return app token.
    """
    supabase_token = request.access_token
    
    if not supabase_token:
        raise HTTPException(status_code=400, detail="Missing access_token")
    
    supabase_client = get_supabase()
    
    # Verify the token with Supabase and get user info
    try:
        # Get user info from Supabase using the access token
        user_response = supabase_client.auth.get_user(supabase_token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        supabase_user = user_response.user
        email = supabase_user.email.lower()
        name = supabase_user.user_metadata.get("full_name", email.split("@")[0])
        
    except Exception as e:
        logger.error(f"Failed to verify Supabase token: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Check if user exists in users table
    try:
        result = supabase_client.table("users").select("*").eq("email", email).execute()
        user = result.data[0] if result.data else None
    except Exception:
        user = None
    
    if not user:
        # Create new user
        import uuid
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        try:
            supabase_client.table("users").insert({
                "id": user_id,
                "name": name,
                "email": email,
                "password_hash": "",  # No password for OAuth users
                "email_verified": True,  # Google emails are verified
                "created_at": now,
                "updated_at": now,
            }).execute()
            
            user = {
                "id": user_id,
                "name": name,
                "email": email,
                "email_verified": True,
            }
            logger.info(f"Created new OAuth user: {email}")
        except Exception as e:
            logger.error(f"Failed to create OAuth user: {e}")
            raise HTTPException(status_code=500, detail="Failed to create user account")
    else:
        # Update existing user's email_verified status if needed
        if not user.get("email_verified"):
            try:
                supabase_client.table("users").update({
                    "email_verified": True,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("email", email).execute()
                user["email_verified"] = True
            except Exception as e:
                logger.warning(f"Failed to update email_verified for {email}: {e}")
    
    # Create app JWT token
    access_token = create_access_token(user["id"], user["email"])
    
    return {
        "token": access_token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", name),
            "email_verified": user.get("email_verified", True),
        },
        "message": "OAuth sign-in successful"
    }


# ═════════════════════════════════════════════════════════════════════════════
#  EMAIL VERIFICATION
# ═════════════════════════════════════════════════════════════════════════════

def send_verification_email(request: SendVerificationEmailRequest) -> dict:
    email    = _norm_email(request.email)
    supabase = get_supabase()
    user     = _ensure_users_row(supabase, email, request.name or "User")

    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email. Please register first.")
    if user.get("email_verified", False):
        raise HTTPException(status_code=400, detail="This email is already verified.")

    name  = request.name or user.get("name", "User")
    token = generate_verification_token(email)
    ok    = send_verification_email_util(email, name, token)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Check SMTP settings.")

    return {"message": f"Verification email sent to {email}.", "success": True, "email": email}


def verify_email(request: VerifyEmailRequest) -> VerifyEmailResponse:
    email = _norm_email(request.email)
    token = request.token.strip()

    if not verify_email_token(email, token):
        raise HTTPException(status_code=400, detail="Invalid or expired verification token. Please request a new one.")

    supabase = get_supabase()
    try:
        supabase.table("users").update({
            "email_verified": True,
            "updated_at":     datetime.utcnow().isoformat(),
        }).eq("email", email).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify email: {str(e)}")

    invalidate_verification_token(email)
    return VerifyEmailResponse(message="Email verified! You can now login.", email=email, verified=True)


def resend_verification_email(request: ResendVerificationEmailRequest) -> dict:
    """
    Resend verification email.
    Auto-recovers missing users table rows from Supabase Auth
    so 'Not Found' never shows for a legitimately registered user.
    """
    email    = _norm_email(request.email)
    supabase = get_supabase()

    # _ensure_users_row will auto-create the row if it's missing
    user = _ensure_users_row(supabase, email)

    if not user:
        # Not in users table AND not in Supabase Auth — truly not registered
        raise HTTPException(
            status_code=404,
            detail="No account found with this email. Please create an account first.",
        )

    if user.get("email_verified", False):
        return {
            "message":          "This email is already verified. You can log in.",
            "success":          True,
            "already_verified": True,
        }

    name  = user.get("name", "User")
    token = generate_verification_token(email)
    ok    = send_verification_email_util(email, name, token)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Check your SMTP settings.")

    return {"message": f"Verification email sent to {email}. Check your inbox.", "success": True, "email": email}


# ═════════════════════════════════════════════════════════════════════════════
#  CURRENT USER DEPENDENCY
# ═════════════════════════════════════════════════════════════════════════════

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Get current authenticated user from JWT.
    Falls back to decoded JWT payload if Supabase is unreachable.
    """
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    
    try:
        payload = decode_token(credentials.credentials)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")
    
    user_id = payload.get("sub")
    email = payload.get("email", "")
    name = payload.get("name", email.split("@")[0] if email else "User")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token - missing user ID.")
    
    # Try to fetch from Supabase first
    try:
        supabase = get_supabase()
        res = supabase.table("users").select("*").eq("id", user_id).single().execute()
        if res.data:
            return res.data
    except Exception as e:
        # Supabase unreachable or user not found - fall back to JWT payload
        logger.warning(f"Supabase unavailable in get_current_user: {e}")
    
    # Fallback: return user data from JWT payload
    logger.info(f"Using JWT fallback for user: {user_id} ({email})")
    return {
        "id": user_id,
        "email": email,
        "name": name,
        "email_verified": True,
        "_from_jwt": True,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  REGISTER
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/register")
def register_user(request: RegisterRequest) -> dict:
    email = _norm_email(request.email)

    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="Invalid email format.")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    supabase = get_supabase()

    # Check if already registered
    try:
        existing = supabase.table("users").select("id, email_verified").eq("email", email).execute()
        if existing.data:
            row = existing.data[0]
            if row.get("email_verified"):
                raise HTTPException(status_code=409, detail="An account with this email already exists. Please login.")
            else:
                # Account exists but not verified — resend verification
                token = generate_verification_token(email)
                send_verification_email_util(email, request.name, token)
                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists but is not verified. We've resent the verification email.",
                )
    except HTTPException:
        raise
    except Exception:
        pass

    # Create in Supabase Auth
    user_id: Optional[str] = None
    try:
        auth_res = supabase.auth.admin.create_user({
            "email":         email,
            "password":      request.password,
            "email_confirm": False,
            "user_metadata": {"name": request.name},
        })
        user_id = auth_res.user.id
    except Exception as e:
        err = str(e).lower()
        if "already" in err or "duplicate" in err or "exists" in err:
            auth_user = _find_auth_user(supabase, email)
            if auth_user:
                user_id = auth_user["id"]
            else:
                raise HTTPException(status_code=409, detail="Email already registered.")
        else:
            raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

    # Insert users table row
    now = datetime.utcnow().isoformat()
    try:
        supabase.table("users").insert({
            "id":             user_id,
            "name":           request.name,
            "email":          email,
            "password_hash":  hash_password(request.password),
            "email_verified": False,
            "created_at":     now,
            "updated_at":     now,
        }).execute()
    except Exception as e:
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    # Send verification email
    verification_token = generate_verification_token(email)
    sent = send_verification_email_util(email, request.name, verification_token)
    if not sent:
        logger.warning("Verification email failed to send for %s — check SMTP settings", email)

    return {
        "message":               f"Account created! Check {email} for your verification link.",
        "success":               True,
        "user_id":               user_id,
        "email":                 email,
        "requires_verification": True,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  LOGIN
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/login")
def login_user(request: LoginRequest) -> AuthResponse:
    email    = _norm_email(request.email)
    attempts = failed_attempts.get(email, 0)

    if attempts >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    supabase = get_supabase()
    try:
        res  = supabase.table("users").select("*").eq("email", email).single().execute()
        user = res.data
    except Exception:
        user = None

    if not user:
        failed_attempts[email] = attempts + 1
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Handle placeholder/empty password hash (manually seeded user)
    if not user.get("password_hash") or user["password_hash"] in ("", "$2b$12$placeholder"):
        raise HTTPException(
            status_code=403,
            detail="Your account was created manually. Please use 'Forgot Password' to set a password.",
        )

    if not verify_password(request.password, user["password_hash"]):
        failed_attempts[email] = attempts + 1
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )

    failed_attempts.pop(email, None)
    token = create_access_token(user["id"], user["email"])
    return AuthResponse(
        token=token,
        user={"id": user["id"], "name": user["name"], "email": user["email"]},
        message="Login successful! Welcome back.",
    )


# ═════════════════════════════════════════════════════════════════════════════
#  GET CURRENT USER (ME)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ═════════════════════════════════════════════════════════════════════════════
#  LOGOUT
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/logout")
def logout_user(token: str) -> dict:
    token_blacklist.add(token)
    return {"message": "Logged out successfully."}


# ═════════════════════════════════════════════════════════════════════════════
#  FORGOT / RESET PASSWORD
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest) -> dict:
    email    = _norm_email(request.email)
    supabase = get_supabase()
    try:
        supabase.auth.reset_password_email(
            email,
            options={"redirect_to": f"{FRONTEND_URL}/reset-password"},
        )
    except Exception:
        pass
    return {"message": "If an account exists with this email, a reset link has been sent.", "success": True}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest) -> dict:
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    supabase = get_supabase()
    try:
        user_res = supabase.auth.get_user(request.access_token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
        user_id = user_res.user.id
        email   = _norm_email(user_res.user.email)
        supabase.auth.admin.update_user_by_id(user_id, {"password": request.new_password})
        try:
            supabase.table("users").update({
                "password_hash": hash_password(request.new_password),
                "updated_at":    datetime.utcnow().isoformat(),
            }).eq("id", user_id).execute()
        except Exception:
            pass
        failed_attempts.pop(email, None)
        return {"message": "Password reset successfully. You can now login.", "success": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")


# ═════════════════════════════════════════════════════════════════════════════
#  UPDATE PASSWORD
# ═════════════════════════════════════════════════════════════════════════════

@router.put("/update-password")
def update_password(request: UpdatePasswordRequest) -> dict:
    email    = _norm_email(request.email)
    supabase = get_supabase()
    try:
        res  = supabase.table("users").select("*").eq("email", email).single().execute()
        user = res.data
    except Exception:
        user = None
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not verify_password(request.old_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid old password.")
    if verify_password(request.new_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="New password must differ from old password.")
    supabase.table("users").update({
        "password_hash": hash_password(request.new_password),
        "updated_at":    datetime.utcnow().isoformat(),
    }).eq("email", email).execute()
    try:
        supabase.auth.admin.update_user_by_id(user["id"], {"password": request.new_password})
    except Exception:
        pass
    return {"message": "Password updated successfully."}


# ═════════════════════════════════════════════════════════════════════════════
#  DELETE ACCOUNT
# ═════════════════════════════════════════════════════════════════════════════

@router.delete("/delete-account")
def delete_account(request: DeleteAccountRequest) -> dict:
    email    = _norm_email(request.email)
    supabase = get_supabase()
    try:
        res  = supabase.table("users").select("*").eq("email", email).single().execute()
        user = res.data
    except Exception:
        user = None
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid password.")
    try:
        supabase.auth.admin.delete_user(user["id"])
    except Exception:
        pass
    supabase.table("users").delete().eq("id", user["id"]).execute()
    failed_attempts.pop(email, None)
    return {"message": "Account deleted successfully."}


# ═════════════════════════════════════════════════════════════════════════════
#  SEND VERIFICATION EMAIL
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/send-verification")
def send_verification_email_route(request: SendVerificationEmailRequest) -> dict:
    return send_verification_email(request)