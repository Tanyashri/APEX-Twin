from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://hal:hal_pass@localhost:5432/hal_twin")

try:
    if "postgresql" in DATABASE_URL:
        test_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 1})
        with test_engine.connect() as conn:
            pass
        engine = test_engine
    else:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
except Exception:
    fallback_url = "sqlite:///hal_twin.db"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
    DATABASE_URL = fallback_url

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
