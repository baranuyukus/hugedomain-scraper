import duckdb
import os
import sys
import shutil
from contextlib import contextmanager

def get_resource_path(relative_path):
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

def setup_persistent_db():
    home_dir = os.path.expanduser("~")
    app_dir = os.path.join(home_dir, ".hugedomains")
    os.makedirs(app_dir, exist_ok=True)
    
    db_file = os.path.join(app_dir, "hugedomains.duckdb")
    bundled_db = get_resource_path("hugedomains.duckdb")
    
    if not os.path.exists(db_file) and os.path.exists(bundled_db) and os.path.abspath(bundled_db) != os.path.abspath(db_file):
        print(f"First run detected. Provisioning database to {db_file}...")
        shutil.copy2(bundled_db, db_file)
        
        bundled_wal = get_resource_path("hugedomains.duckdb.wal")
        if os.path.exists(bundled_wal):
            shutil.copy2(bundled_wal, db_file + ".wal")
            
    return db_file

DB_PATH = os.getenv("DB_PATH", setup_persistent_db())
_global_con = None

def get_connection():
    global _global_con
    if _global_con is None:
        _global_con = duckdb.connect(DB_PATH, read_only=False)
        _global_con.execute("PRAGMA memory_limit='4GB'")
        _global_con.execute("PRAGMA threads=4")
    return _global_con

def init_db():
    """Initializes the DuckDB database with the required schema."""
    con = get_connection()
    
    try:
        con.execute("CREATE SEQUENCE IF NOT EXISTS snapshot_seq START 1")
    except Exception:
        pass
        
    try:
        con.execute("CREATE SEQUENCE IF NOT EXISTS domain_seq START 1")
    except Exception:
        pass

    con.execute("""
        CREATE TABLE IF NOT EXISTS domains (
            id INTEGER DEFAULT nextval('domain_seq') PRIMARY KEY,
            name VARCHAR UNIQUE,
            length INTEGER
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER DEFAULT nextval('snapshot_seq') PRIMARY KEY,
            name VARCHAR NOT NULL,
            created_at TIMESTAMP DEFAULT current_timestamp,
            row_count BIGINT DEFAULT 0
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS snapshot_data (
            snapshot_id INTEGER,
            domain_id INTEGER,
            domain VARCHAR,
            price_usd DECIMAL(12,2),
            length INTEGER
        )
    """)
    
    con.execute("CREATE INDEX IF NOT EXISTS idx_domain ON snapshot_data(domain)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_snapshot ON snapshot_data(snapshot_id)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_snap_domain ON snapshot_data(snapshot_id, domain)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_sd_domain_id ON snapshot_data(domain_id)")
    
    print("Database initialized successfully.")

@contextmanager
def get_db():
    """Yields a thread-safe connection clone for FastAPI endpoints and Scraper."""
    # DuckDB threading is best when each thread clones the main connection
    con = get_connection().cursor()
    try:
        yield con
    finally:
        con.close()

if __name__ == "__main__":
    init_db()
