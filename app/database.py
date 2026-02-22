import os
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event
from dotenv import load_dotenv

load_dotenv()

# 1. Configuration: Get DB URL from env, default to local SQLite
# For Supabase, you will add DATABASE_URL to your .env
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")

# 2. Compatibility Fix: Postgres requires postgresql:// but many platforms provide postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Connection Arguments
# - SQLite needs check_same_thread=False for multi-threading.
# - PostgreSQL doesn't need it but benefits from pool_pre_ping to handle dropped connections.
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL, 
    echo=False, 
    connect_args=connect_args,
    # pool_pre_ping helps recover from Supabase 'pausing' or dropped network connections
    pool_pre_ping=True if "postgresql" in DATABASE_URL else False
)

# 4. Performance Tuning: WAL Mode for local SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

def create_db_and_tables():
    """Initializes the database schema."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """FastAPI dependency to provide a database session."""
    with Session(engine) as session:
        yield session
