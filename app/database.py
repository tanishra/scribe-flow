import os
from sqlmodel import SQLModel, create_engine, Session

# Get DB URL from env, default to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")

# Postgres requires postgresql:// but some hosts provide postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite specific args
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
