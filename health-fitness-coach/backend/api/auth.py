__all__ = [
    'RegisterRequest', 'LoginRequest', 'AuthResponse', 'UserResponse',
    'UpdatePasswordRequest', 'ResetPasswordRequest', 'DeleteAccountRequest',
    'register_user', 'login_user', 'update_password', 'reset_password_admin',
    'delete_account', 'get_current_user', 'logout_user'
]
"""Authentication module for Health Fitness Coach"""

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
from sqlalchemy.orm import Session

from database import get_db
from database.models import Base, User

# --- Config ---
SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "fitness-coach-secret-key-change-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer(auto_error=False)

# --- Rate Limiting & Token Blacklist ---
failed_attempts: dict = {}
token_blacklist: set = set()
MAX_FAILED_ATTEMPTS = 5


# --- Schemas ---
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=100)
    password: str = Field(min_length=6, max_length=128)

    @property
    def is_password_strong(self) -> bool:
        """Check if password meets recommended strength criteria"""
        has_upper = any(c.isupper() for c in self.password)
        has_lower = any(c.islower() for c in self.password)
        has_digit = any(c.isdigit() for c in self.password)
        return (
            len(self.password) >= 8
            and has_upper
            and has_lower
            and has_digit
        )


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict
    message: str = "Success"


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: Optional[str] = None


class UpdatePasswordRequest(BaseModel):
    email: str
    old_password: str
    new_password: str = Field(min_length=6, max_length=128)


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str = Field(min_length=6, max_length=128)


class DeleteAccountRequest(BaseModel):
    email: str
    password: str


# --- Password Helpers ---
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """Verify password against bcrypt hash"""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# --- Token Helpers ---
def create_access_token(user_id: str, email: str) -> str:
    """Generate JWT access token"""
    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token"""

    # Check if token has been blacklisted (logged out)
    if token in token_blacklist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been invalidated. Please login again.",
        )

    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please login again.",
        )


# --- Current User Dependency ---
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        security
    ),
    db: Session = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token.
    Raises 401 if no token or invalid token.
    """
    # FIX: Raise error instead of returning None
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login.",
        )

    payload = decode_token(credentials.credentials)

    user = db.query(User).filter(
        User.id == payload["sub"]
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Account may have been deleted.",
        )

    return user


# --- Auth Functions ---
def register_user(
    request: RegisterRequest,
    db: Session
) -> AuthResponse:
    """Register a new user"""

    # Validate email format
    email_pattern = (
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    if not re.match(email_pattern, request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format.",
        )

    # Validate password strength
    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters.",
        )

    # Check if email already exists
    existing = db.query(User).filter(
        User.email == request.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An account with this email already exists. "
                "Please login or use a different email."
            ),
        )

    # Create new user
    user = User(
        id=str(uuid.uuid4()),
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token immediately after registration
    token = create_access_token(user.id, user.email)

    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email
        },
        message="Registration successful! Welcome to FitCoach AI."
    )


def login_user(
    request: LoginRequest,
    db: Session
) -> AuthResponse:
    """Login an existing user"""

    # FIX: Rate limiting - block after too many failed attempts
    attempts = failed_attempts.get(request.email, 0)
    if attempts >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many failed attempts ({MAX_FAILED_ATTEMPTS}). "
                "Please try again later."
            ),
        )

    # Find user by email
    user = db.query(User).filter(
        User.email == request.email
    ).first()

    if not user:
        # Increment failed attempts
        failed_attempts[request.email] = attempts + 1
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "No account found with this email. "
                "Please check your email or register."
            ),
        )

    # Check password hash exists
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account setup incomplete. Please contact support.",
        )

    # Verify password
    if not verify_password(request.password, user.password_hash):
        # Increment failed attempts
        failed_attempts[request.email] = attempts + 1
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
        )

    # Reset failed attempts on successful login
    failed_attempts.pop(request.email, None)

    # Generate token
    token = create_access_token(user.id, user.email)

    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email
        },
        message="Login successful! Welcome back."
    )


def logout_user(token: str) -> dict:
    """
    Logout user by blacklisting their token.
    Token will be invalid for all future requests.
    """
    token_blacklist.add(token)
    return {"message": "Logged out successfully."}


def update_password(
    request: UpdatePasswordRequest,
    db: Session
) -> dict:
    """Update user password (requires old password verification)"""

    user = db.query(User).filter(
        User.email == request.email
    ).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Verify old password first
    if not verify_password(
        request.old_password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid old password.",
        )

    # Prevent using same password
    if verify_password(request.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from old password.",
        )

    user.password_hash = hash_password(request.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Password updated successfully."}


def reset_password_admin(
    request: ResetPasswordRequest,
    db: Session
) -> dict:
    """Reset user password - admin only"""

    user = db.query(User).filter(
        User.email == request.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.password_hash = hash_password(request.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()

    # Clear any failed attempts for this user
    failed_attempts.pop(request.email, None)

    return {
        "message": f"Password reset successfully for {request.email}"
    }


def delete_account(
    request: DeleteAccountRequest,
    db: Session
) -> dict:
    """Delete user account (requires password verification)"""

    user = db.query(User).filter(
        User.email == request.email
    ).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Verify password before deletion
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password.",
        )

    db.delete(user)
    db.commit()

    # Clean up failed attempts
    failed_attempts.pop(request.email, None)

    return {"message": "Account deleted successfully."}