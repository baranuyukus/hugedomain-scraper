from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import time
import asyncio
import os
import sys
from database import get_db, init_db
from scraper_service import run_scraper_engine, stop_scraper_engine, scraper_state

app = FastAPI(title="HugeDomains Tracker API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Initialize DB (creates it if missing)
    init_db()

@app.get("/")
def read_root():
    return {"message": "Welcome to HugeDomains Tracker API", "status": "running"}

@app.get("/snapshots")
def get_snapshots():
    """Returns a list of all available snapshots."""
    try:
        with get_db() as con:
            result = con.execute("SELECT id, name, created_at, row_count FROM snapshots ORDER BY id DESC").fetchall()
            
            snapshots = []
            for row in result:
                snapshots.append({
                    "id": row[0],
                    "name": row[1],
                    "created_at": row[2],
                    "row_count": row[3]
                })
            return {"snapshots": snapshots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/snapshots/{snapshot_id}")
def delete_snapshot(snapshot_id: int):
    """Deletes a snapshot and its associated data."""
    try:
        with get_db() as con:
            # Delete from snapshot_data first due to foreign key constraints conceptually (though DuckDB handles it based on schema)
            con.execute("DELETE FROM snapshot_data WHERE snapshot_id = ?", [snapshot_id])
            con.execute("DELETE FROM snapshots WHERE id = ?", [snapshot_id])
            return {"message": f"Snapshot {snapshot_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rows")
def get_rows(
    snapshot_id: int, 
    search: str = "", 
    search_mode: str = "contains", # prefix, exact, contains
    min_price: float = None,
    max_price: float = None,
    min_length: int = None,
    max_length: int = None,
    sort_col: str = "domain", 
    sort_dir: str = "asc", 
    limit: int = 100, 
    offset: int = 0
):
    """Fetches paginated rows from a specific snapshot with sorting and filtering."""
    if sort_col not in ["domain", "price_usd", "length"]:
        sort_col = "domain"
    if sort_dir.lower() not in ["asc", "desc"]:
        sort_dir = "asc"
        
    start_time = time.time()
    try:
        with get_db() as con:
            # Build query dynamically
            base_query = "FROM snapshot_data WHERE snapshot_id = ?"
            params = [snapshot_id]
            
            # Text search (Case Insensitive ILIKE is very fast in DuckDB)
            if search:
                if search_mode == "prefix":
                    base_query += " AND domain ILIKE ?"
                    params.append(f"{search}%")
                elif search_mode == "exact":
                    base_query += " AND domain = ?"
                    params.append(search.lower())
                else: # contains
                    base_query += " AND domain ILIKE ?"
                    params.append(f"%{search}%")
            
            if min_price is not None:
                base_query += " AND price_usd >= ?"
                params.append(min_price)
            if max_price is not None:
                base_query += " AND price_usd <= ?"
                params.append(max_price)
                
            # Length filters
            if min_length is not None:
                base_query += " AND length >= ?"
                params.append(min_length)
            if max_length is not None:
                base_query += " AND length <= ?"
                params.append(max_length)
                
            # Execute COUNT query
            count_query = f"SELECT count(*) {base_query}"
            total_count = con.execute(count_query, params).fetchone()[0]
            
            # Execute DATA query
            data_query = f"SELECT domain_id, domain, price_usd, length {base_query} ORDER BY {sort_col} {sort_dir} LIMIT {limit} OFFSET {offset}"
            result = con.execute(data_query, params).fetchall()
            
            rows = []
            for r in result:
                rows.append({"domain_id": r[0], "domain": r[1], "price_usd": r[2], "length": r[3]})
                
            elapsed_ms = (time.time() - start_time) * 1000
            
            return {
                "rows": rows,
                "total_count": total_count,
                "elapsed_ms": round(elapsed_ms, 2)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/diff")
def get_diff(
    snapshot_a: int,
    snapshot_b: int,
    diff_type: str = "all", # all, new, deleted, changed
    limit: int = 100,
    offset: int = 0
):
    """
    Compares two snapshots and returns the differences.
    snapshot_a is the OLD snapshot, snapshot_b is the NEW snapshot.
    """
    start_time = time.time()
    try:
        with get_db() as con:
            filter_condition = ""
            if diff_type == "new":
                filter_condition = "AND a.domain IS NULL AND b.domain IS NOT NULL"
            elif diff_type == "deleted":
                filter_condition = "AND a.domain IS NOT NULL AND b.domain IS NULL"
            elif diff_type == "changed":
                filter_condition = "AND a.domain IS NOT NULL AND b.domain IS NOT NULL AND a.price_usd != b.price_usd"
            else:
                filter_condition = "AND (a.domain IS NULL OR b.domain IS NULL OR a.price_usd != b.price_usd)"
            
            # Using FULL OUTER JOIN which DuckDB optimizes with Hash Joins very efficiently
            base_query = f"""
                FROM (SELECT domain_id, domain, price_usd FROM snapshot_data WHERE snapshot_id = {snapshot_a}) a
                FULL OUTER JOIN (SELECT domain_id, domain, price_usd FROM snapshot_data WHERE snapshot_id = {snapshot_b}) b
                ON a.domain_id = b.domain_id
                WHERE 1=1 {filter_condition}
            """
            
            # Execute COUNT
            count_query = f"SELECT count(*) {base_query}"
            total_count = con.execute(count_query).fetchone()[0]
            
            # Execute DATA
            data_query = f"""
                SELECT 
                    COALESCE(a.domain_id, b.domain_id) as domain_id,
                    COALESCE(a.domain, b.domain) as domain,
                    a.price_usd as old_price,
                    b.price_usd as new_price,
                    CASE 
                        WHEN a.domain IS NULL THEN 'NEW'
                        WHEN b.domain IS NULL THEN 'DELETED'
                        WHEN a.price_usd != b.price_usd THEN 'CHANGED'
                        ELSE 'UNCHANGED'
                    END as status
                {base_query}
                ORDER BY domain ASC
                LIMIT {limit} OFFSET {offset}
            """
            result = con.execute(data_query).fetchall()
            
            rows = []
            for r in result:
                rows.append({
                    "domain_id": r[0],
                    "domain": r[1],
                    "old_price": r[2],
                    "new_price": r[3],
                    "status": r[4]
                })
                
            elapsed_ms = (time.time() - start_time) * 1000
            return {
                "rows": rows,
                "total_count": total_count,
                "elapsed_ms": round(elapsed_ms, 2)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/domain/{domain_id}/history")
def get_domain_history(domain_id: int):
    """Returns the complete timeline of a domain across all snapshots."""
    try:
        with get_db() as con:
            domain_name = con.execute("SELECT name FROM domains WHERE id = ?", [domain_id]).fetchone()
            if not domain_name:
                raise HTTPException(status_code=404, detail="Domain not found")
                
            query = """
                SELECT 
                    s.id as snapshot_id,
                    s.name as snapshot_name,
                    s.created_at,
                    sd.price_usd
                FROM snapshots s
                LEFT JOIN snapshot_data sd ON s.id = sd.snapshot_id AND sd.domain_id = ?
                ORDER BY s.id ASC
            """
            result = con.execute(query, [domain_id]).fetchall()
            
            history = []
            for r in result:
                history.append({
                    "snapshot_id": r[0],
                    "snapshot_name": r[1],
                    "created_at": r[2],
                    "price_usd": r[3]
                })
                
            for i in range(len(history)):
                if i == 0:
                    history[i]["status"] = "NEW" if history[i]["price_usd"] is not None else "ABSENT"
                else:
                    prev_price = history[i-1]["price_usd"]
                    curr_price = history[i]["price_usd"]
                    if prev_price is None and curr_price is not None:
                        history[i]["status"] = "NEW"
                    elif prev_price is not None and curr_price is None:
                        history[i]["status"] = "DELETED"
                    elif prev_price != curr_price and curr_price is not None:
                        history[i]["status"] = "CHANGED"
                    elif curr_price is not None:
                        history[i]["status"] = "UNCHANGED"
                    else:
                        history[i]["status"] = "ABSENT"
                        
            return {
                "domain_id": domain_id,
                "domain": domain_name[0],
                "history": history
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape/start")
async def start_scraper(snapshot_name: str):
    """Starts the HugeDomains scraper in the background."""
    if scraper_state.is_running:
        raise HTTPException(status_code=400, detail="Scraper is already running")
    
    # We use asyncio.create_task to run the heavy loop in the background of the event loop
    asyncio.create_task(run_scraper_engine(snapshot_name))
    return {"message": f"Scraping started for '{snapshot_name}'"}

@app.get("/scrape/status")
def get_scraper_status():
    """Returns the live status of the running extraction."""
    return {
        "is_running": scraper_state.is_running,
        "status": scraper_state.status,
        "snapshot_name": scraper_state.snapshot_name,
        "total_extracted": scraper_state.total_extracted
    }

@app.post("/scrape/stop")
def stop_scraper():
    """Safely signals the scraper to stop."""
    if not scraper_state.is_running:
        return {"message": "Scraper is not running"}
    stop_scraper_engine()
    return {"message": "Stop signal sent to scraper"}

# === STATIC FILES FOR FRONTEND ===
def get_resource_path(relative_path):
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    return os.path.join(base_path, relative_path)

frontend_dist_path = get_resource_path(os.path.join("frontend", "dist"))

if os.path.exists(frontend_dist_path):
    # Mount the assets directory (js/css/images)
    assets_path = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    # Add a catch-all for React Router and root index.html
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        path = os.path.join(frontend_dist_path, full_path)
        if os.path.exists(path) and os.path.isfile(path):
            return FileResponse(path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
