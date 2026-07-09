"""Database initialization"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from .models import Base

# Create engine
engine = create_engine(settings.database_url_sync)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    print(" Database tables created successfully")


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
