from sqlalchemy import text, inspect
from .database import engine
from .services.logging_service import logger

def run_migrations():
    """
    Checks for missing columns in the 'blog' table and adds them if necessary.
    This is a lightweight manual migration to support schema changes without Alembic.
    """
    logger.info("Checking for pending database migrations...")
    
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("blog")]
    
    with engine.connect() as conn:
        # 1. Add thoughts_json if missing
        if "thoughts_json" not in columns:
            logger.info("Migrating: Adding 'thoughts_json' column to 'blog' table.")
            try:
                # Use single quotes for the string literal '[]'
                conn.execute(text("ALTER TABLE blog ADD COLUMN thoughts_json TEXT DEFAULT '[]'"))
                conn.commit()
                logger.info("Migration successful: Added 'thoughts_json'.")
            except Exception as e:
                logger.error(f"Migration failed for 'thoughts_json': {e}")

        # 2. Add intermediate_content if missing
        if "intermediate_content" not in columns:
            logger.info("Migrating: Adding 'intermediate_content' column to 'blog' table.")
            try:
                conn.execute(text("ALTER TABLE blog ADD COLUMN intermediate_content TEXT DEFAULT ''"))
                conn.commit()
                logger.info("Migration successful: Added 'intermediate_content'.")
            except Exception as e:
                logger.error(f"Migration failed for 'intermediate_content': {e}")
        
        # 3. Add publishing URL columns if missing (just in case)
        for col in ["hashnode_url", "medium_url", "linkedin_url"]:
            if col not in columns:
                logger.info(f"Migrating: Adding '{col}' column to 'blog' table.")
                try:
                    conn.execute(text(f"ALTER TABLE blog ADD COLUMN {col} TEXT"))
                    conn.commit()
                except Exception as e:
                    logger.error(f"Migration failed for '{col}': {e}")

    logger.info("Database migration check complete.")
