"""
Authentication module — FitCoach AI
────────────────────────────────────────────────────────
Replaced SQLAlchemy with Supabase for deployment.
Added:
  - forgot_password  (sends Supabase reset email)
  - reset_password   (validates token + updates password)
  - Email verification with token-based verification
  - send_verification_email, verify_email, resend_verification_email
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
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
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
    invalidate_verification_token
)

# ── Supabase client ───────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── JWT config ────────────────────────────────────────
SECRET_KEY                  = os.getenv("JWT_SECRET_KEY", "fitness-coach-secret-key-change-in-production")
ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24   # 24 hours

security = HTTPBearer(auto_error=False)

# ── In-memory rate limiting + blacklist ───────────────
failed_attempts: dict = {}
token_blacklist:  set = set()
MAX_FAILED_ATTEMPTS = 5


# ── Helper ────────────────────────────────────────────
def _norm_email(email: str) -> str:
    """Normalize email for consistent storage and lookup."""
    return (email or "").lower().strip()


# ══════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════

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
    """User submits their email to request a password reset link."""
    email: str

class ResetPasswordRequest(BaseModel):
    """User submits new password + Supabase access token from email link."""
    access_token: str   # from Supabase reset email URL param
    new_password: str = Field(min_length=6, max_length=128)

class DeleteAccountRequest(BaseModel):
    email:    str
    password: str


# ── Email Verification Schemas ───────────────────────────────
class SendVerificationEmailRequest(BaseModel):
    """Request to send verification email"""
    email: str
    name: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    """Request to verify email with token"""
    email: str
    token: str


class VerifyEmailResponse(BaseModel):
    """Response for email verification"""
    message: str
    email: str
    verified: bool


class ResendVerificationEmailRequest(BaseModel):
    """Request to resend verification email"""
    email: str


# ══════════════════════════════════════════════════════
#  PASSWORD HELPERS
# ══════════════════════════════════════════════════════

def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ══════════════════════════════════════════════════════
#  JWT HELPERS
# ══════════════════════════════════════════════════════

def create_access_token(user_id: str, email: str) -> str:
    expire  = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    if token in token_blacklist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been invalidated. Please login again.",
        )
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please login again.",
        )


# ══════════════════════════════════════════════════════
#  EMAIL VERIFICATION
# ══════════════════════════════════════════════════════

def send_verification_email(request: SendVerificationEmailRequest) -> dict:
    """
    Send verification email to user.
    Can be used for initial registration or resending.
    """
    email = _norm_email(request.email)

    supabase = get_supabase()

    # Get user from database
    try:
        res = supabase.table("users").select("*").eq("email", email).single().execute()
        user = res.data
    except Exception:
        user = None

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.get("email_verified", False):
        raise HTTPException(status_code=400, detail="This email is already verified.")

    # Generate and send verification token
    name = request.name or user.get("name", "User")
    verification_token = generate_verification_token(email)
    success = send_verification_email_util(email, name, verification_token)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

    return {
        "message": f"Verification email sent to {email}. Please check your inbox.",
        "success": True,
        "email": email,
    }


def verify_email(request: VerifyEmailRequest) -> VerifyEmailResponse:
    """
    Verify email with token.
    Updates user's email_verified field in database.
    """
    email = _norm_email(request.email)
    token = request.token.strip()

    # Verify token
    if not verify_email_token(email, token):
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")

    supabase = get_supabase()

    # Update user in database
    try:
        supabase.table("users").update({
            "email_verified": True,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("email", email).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify email: {str(e)}")

    # Remove verification token
    invalidate_verification_token(email)

    return VerifyEmailResponse(
        message="Email verified successfully! You can now login.",
        email=email,
        verified=True,
    )


def resend_verification_email(request: ResendVerificationEmailRequest) -> dict:
    """
    Resend verification email to user.
    """
    email = _norm_email(request.email)

    supabase = get_supabase()

    # Get user from database
    try:
        res = supabase.table("users").select("*").eq("email", email).single().execute()
        user = res.data
    except Exception:
        user = None

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.get("email_verified", False):
        return {
            "message": "This email is already verified.",
            "success": True,
            "already_verified": True,
        }

    # Generate and send new verification token
    name = user.get("name", "User")
    verification_token = generate_verification_token(email)
    success = send_verification_email_util(email, name, verification_token)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

    return {
        "message": f"Verification email resent to {email}.",
        "success": True,
        "email": email,
    }


# ══════════════════════════════════════════════════════
#  CURRENT USER DEPENDENCY (Supabase version)
# ══════════════════════════════════════════════════════

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Validate JWT and return user dict from Supabase.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login.",
        )
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )
    try:
        supabase = get_supabase()
        res = supabase.table("users").select("*").eq("id", user_id).single().execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Account may have been deleted.",
            )
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth error: {str(e)}")


# ══════════════════════════════════════════════════════
#  REGISTER
# ══════════════════════════════════════════════════════

def register_user(request: RegisterRequest) -> dict:
    """
    Register a new user with email verification required.
    1. Validate email + password
    2. Check if email already exists in users table
    3. Create user in Supabase Auth (email NOT auto-confirmed)
    4. Insert matching row in users table — rollback auth user on failure
    5. Send verification email
    """
    email = _norm_email(request.email)

    # Validate email format
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    supabase = get_supabase()

    # Check if email already exists in users table
    try:
        existing = supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists. Please login or use a different email.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    # Create user in Supabase Auth (email NOT confirmed yet)
    user_id: Optional[str] = None
    try:
        auth_res = supabase.auth.admin.create_user({
            "email":          email,
            "password":       request.password,
            "email_confirm":  False,
            "user_metadata":  {"name": request.name},
        })
        user_id = auth_res.user.id
    except Exception as e:
        err = str(e).lower()
        if "already" in err or "duplicate" in err or "exists" in err:
            # Auth user exists. Check whether the users table is in sync.
            existing_row = supabase.table("users").select("id").eq("email", email).execute()
            if existing_row.data:
                raise HTTPException(status_code=409, detail="Email already registered.")

            # Orphan: auth user exists but no users table row. Recover by backfilling.
            try:
                listing = supabase.auth.admin.list_users()
                # supabase-py may return a list, or an object with `.users`
                candidates = listing.users if hasattr(listing, "users") else listing
                orphan = next(
                    (u for u in candidates if (getattr(u, "email", "") or "").lower() == email),
                    None,
                )
            except Exception:
                orphan = None

            if not orphan:
                raise HTTPException(status_code=409, detail="Email already registered.")

            user_id = orphan.id
        else:
            raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

    # Create user record in users table — must succeed, or roll back auth user
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
        # Roll back the auth user so we don't orphan the account
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed while creating user record: {str(e)}",
        )

    # Generate verification token and send email
    verification_token = generate_verification_token(email)
    send_verification_email_util(email, request.name, verification_token)

    return {
        "message": f"Registration successful! Please check your email ({email}) to verify your account. The verification link expires in 24 hours.",
        "success": True,
        "user_id": user_id,
        "email": email,
        "requires_verification": True,
    }


# ══════════════════════════════════════════════════════
#  LOGIN
# ══════════════════════════════════════════════════════

def login_user(request: LoginRequest) -> AuthResponse:
    """
    Login existing user.
    1. Rate limit check
    2. Find user in Supabase users table
    3. Verify password
    4. Check if email is verified
    5. Return JWT token
    """
    email = _norm_email(request.email)

    attempts = failed_attempts.get(email, 0)
    if attempts >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Please try again later.",
        )

    supabase = get_supabase()

    try:
        res = supabase.table("users").select("*").eq("email", email).single().execute()
        user = res.data
    except Exception:
        user = None

    if not user or not user.get("password_hash"):
        failed_attempts[email] = attempts + 1
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not verify_password(request.password, user["password_hash"]):
        failed_attempts[email] = attempts + 1
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Check if email is verified
    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your email for the verification link.",
        )

    failed_attempts.pop(email, None)
    token = create_access_token(user["id"], user["email"])

    return AuthResponse(
        token=token,
        user={"id": user["id"], "name": user["name"], "email": user["email"]},
        message="Login successful! Welcome back.",
    )


# ══════════════════════════════════════════════════════
#  LOGOUT
# ══════════════════════════════════════════════════════

def logout_user(token: str) -> dict:
    """Blacklist the JWT token so it can't be reused."""
    token_blacklist.add(token)
    return {"message": "Logged out successfully."}


# ══════════════════════════════════════════════════════
#  FORGOT PASSWORD
# ══════════════════════════════════════════════════════

def forgot_password(request: ForgotPasswordRequest) -> dict:
    """
    Send a password reset email via Supabase.
    Always returns success to prevent user enumeration.
    """
    email = _norm_email(request.email)
    supabase = get_supabase()
    try:
        supabase.auth.reset_password_email(
            email,
            options={
                "redirect_to": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password"
            }
        )
    except Exception:
        pass

    return {
        "message": "If an account exists with this email, a password reset link has been sent.",
        "success": True,
    }


# ══════════════════════════════════════════════════════
#  RESET PASSWORD
# ══════════════════════════════════════════════════════

def reset_password(request: ResetPasswordRequest) -> dict:
    """
    Reset the user's password using the Supabase access token from the reset email link.
    """
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    supabase = get_supabase()

    try:
        user_res = supabase.auth.get_user(request.access_token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")

        user_id = user_res.user.id
        email   = _norm_email(user_res.user.email)

        # Update password in Supabase Auth
        supabase.auth.admin.update_user_by_id(
            user_id,
            {"password": request.new_password}
        )

        # Also update bcrypt hash in users table
        try:
            supabase.table("users").update({
                "password_hash": hash_password(request.new_password),
                "updated_at":    datetime.utcnow().isoformat(),
            }).eq("id", user_id).execute()
        except Exception:
            pass

        failed_attempts.pop(email, None)

        return {"message": "Password reset successfully. You can now login with your new password.", "success": True}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link. Please request a new one.",
        )


# ══════════════════════════════════════════════════════
#  UPDATE PASSWORD
# ══════════════════════════════════════════════════════

def update_password(request: UpdatePasswordRequest) -> dict:
    """Update password — requires old password verification."""
    email = _norm_email(request.email)
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
        raise HTTPException(status_code=400, detail="New password must be different from old password.")

    supabase.table("users").update({
        "password_hash": hash_password(request.new_password),
        "updated_at":    datetime.utcnow().isoformat(),
    }).eq("email", email).execute()

    try:
        supabase.auth.admin.update_user_by_id(
            user["id"], {"password": request.new_password}
        )
    except Exception:
        pass

    return {"message": "Password updated successfully."}


# ══════════════════════════════════════════════════════
#  DELETE ACCOUNT
# ══════════════════════════════════════════════════════

def delete_account(request: DeleteAccountRequest) -> dict:
    """Delete user account — requires password verification."""
    email = _norm_email(request.email)
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