import duckdb
import argparse
import time
import os

from database import DB_PATH

def import_csv(csv_path: str, snapshot_name: str):
    """
    Imports a large CSV file directly into DuckDB using vectorized SQL queries.
    This guarantees memory efficiency and immense speed.
    """
    if not os.path.exists(csv_path):
        print(f"Error: Could not find CSV file at {csv_path}")
        return False
        
    start_time = time.time()
    
    # Needs WRITING connection, so we don't open as read_only=True
    con = duckdb.connect(DB_PATH)
    
    # 1. Ensure schema exists (in case it didn't)
    try:
        con.execute("CREATE SEQUENCE IF NOT EXISTS snapshot_seq START 1")
    except:
        pass
        
    con.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER DEFAULT nextval('snapshot_seq') PRIMARY KEY,
            name VARCHAR NOT NULL,
            created_at TIMESTAMP DEFAULT current_timestamp,
            row_count BIGINT DEFAULT 0
        )
    """)

    try:
        con.execute("CREATE SEQUENCE IF NOT EXISTS domain_seq START 1")
    except:
        pass

    con.execute("""
        CREATE TABLE IF NOT EXISTS domains (
            id INTEGER DEFAULT nextval('domain_seq') PRIMARY KEY,
            name VARCHAR UNIQUE,
            length INTEGER
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
    
    # 2. Insert new Snapshot ID
    print(f"Creating snapshot entry for '{snapshot_name}'...")
    con.execute("INSERT INTO snapshots (name) VALUES (?)", [snapshot_name])
    snap_id = con.execute("SELECT currval('snapshot_seq')").fetchone()[0]
    
    # 3. FAST Vectorized Bulk Import
    print(f"Starting bulk import into database for snapshot_id={snap_id}...")
    try:
        # 3.1 Extract Unique Domains
        con.execute(f"""
        INSERT INTO domains (name, length)
        SELECT DISTINCT LOWER(TRIM(Domain)), LENGTH(SPLIT_PART(LOWER(TRIM(Domain)), '.', 1))
        FROM read_csv_auto('{csv_path}', header=True)
        WHERE Domain IS NOT NULL AND Domain != ''
        ON CONFLICT (name) DO NOTHING;
        """)

        # 3.2 Insert Snapshot Data mapped to Domain IDs
        query = f"""
        INSERT INTO snapshot_data (snapshot_id, domain_id, domain, price_usd, length)
        SELECT 
            {snap_id} as snapshot_id,
            d.id as domain_id,
            LOWER(TRIM(csv.Domain)) as domain,
            CAST(REPLACE(REPLACE(csv.Price, '$', ''), ',', '') AS DECIMAL(12,2)) as price_usd,
            d.length as length
        FROM read_csv_auto('{csv_path}', header=True) csv
        JOIN domains d ON d.name = LOWER(TRIM(csv.Domain))
        WHERE csv.Domain IS NOT NULL AND csv.Domain != '';
        """
        con.execute(query)
        
        # 4. Update row count metadata
        count = con.execute(f"SELECT COUNT(*) FROM snapshot_data WHERE snapshot_id = {snap_id}").fetchone()[0]
        con.execute(f"UPDATE snapshots SET row_count = ? WHERE id = ?", [count, snap_id])
        
        elapsed = time.time() - start_time
        print(f"SUCCESS: Imported {count} rows in {elapsed:.2f} seconds!")
        
    except Exception as e:
        print(f"ERROR during import: {str(e)}")
        # Delete the broken snapshot metadata if fails
        con.execute(f"DELETE FROM snapshots WHERE id = {snap_id}")
        return False
    finally:
        con.close()
        
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DuckDB Fast CSV Importer")
    parser.add_argument("csv_path", help="Path to the Domains CSV file to import")
    parser.add_argument("--name", required=True, help="Snapshot Name (e.g. '2023-11-Scraping')")
    
    args = parser.parse_args()
    import_csv(args.csv_path, args.name)
