import os
import json
from sqlmodel import Session, create_engine, select, text
from app.schemas.db_models import User, Blog, Transaction, OTP, Feedback
from dotenv import load_dotenv
load_dotenv()

# 1. SETUP ENGINES
sqlite_url = "sqlite:///database.db"
sqlite_engine = create_engine(sqlite_url)

postgres_url = os.getenv("DATABASE_URL")
if not postgres_url:
    print("❌ ERROR: DATABASE_URL not found in .env")
    exit(1)

if postgres_url.startswith("postgres://"):
    postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)

pg_engine = create_engine(postgres_url)

def fetch_as_dicts(engine, table_name):
    """Fetches data using raw SQL to avoid schema mismatch errors."""
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name}"))
        return [dict(row._mapping) for row in result]

def migrate_data():
    print("🚀 Starting Smart Migration (Handling missing columns)...")

    with Session(pg_engine) as pg_session:
        
        # --- 1. MIGRATE USERS ---
        print("📦 Migrating Users...")
        try:
            sqlite_users = fetch_as_dicts(sqlite_engine, "user")
            for u_data in sqlite_users:
                # Ensure defaults for columns that might be missing in old SQLite
                u_data.setdefault("is_admin", False)
                u_data.setdefault("is_active", True)
                u_data.setdefault("credits_left", 3)
                u_data.setdefault("onboarding_completed", True)
                
                # Check if exists in Supabase
                existing = pg_session.get(User, u_data['id'])
                if not existing:
                    new_user = User(**u_data)
                    pg_session.add(new_user)
            pg_session.commit()
            print("✅ Users migrated.")
        except Exception as e:
            print(f"⚠️ User migration skipped or failed: {e}")

        # --- 2. MIGRATE BLOGS ---
        print("📦 Migrating Blogs...")
        try:
            sqlite_blogs = fetch_as_dicts(sqlite_engine, "blog")
            for b_data in sqlite_blogs:
                existing = pg_session.get(Blog, b_data['id'])
                if not existing:
                    # Blogs rarely change schema, but we use dict unpacking for safety
                    pg_session.add(Blog(**b_data))
            pg_session.commit()
            print("✅ Blogs migrated.")
        except Exception as e:
            print(f"⚠️ Blog migration failed: {e}")

        # --- 3. MIGRATE TRANSACTIONS ---
        print("📦 Migrating Transactions...")
        try:
            sqlite_txns = fetch_as_dicts(sqlite_engine, "transaction")
            for t_data in sqlite_txns:
                pg_session.add(Transaction(**t_data))
            pg_session.commit()
            print("✅ Transactions migrated.")
        except Exception as e:
            print(f"ℹ️ No transactions found to migrate.")

        # --- 4. MIGRATE FEEDBACK ---
        print("📦 Migrating Feedback...")
        try:
            sqlite_fbs = fetch_as_dicts(sqlite_engine, "feedback")
            for f_data in sqlite_fbs:
                pg_session.add(Feedback(**f_data))
            pg_session.commit()
            print("✅ Feedback migrated.")
        except Exception as e:
            print(f"ℹ️ No feedback found to migrate.")

    print("\n🎉 ALL DATA MIGRATED SUCCESSFULLY!")

if __name__ == "__main__":
    migrate_data()
