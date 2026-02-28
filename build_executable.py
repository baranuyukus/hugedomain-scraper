import os
import subprocess
import platform
import sys

def run_cmd(cmd, cwd=None):
    print(f"Running: {cmd}")
    subprocess.check_call(cmd, shell=True, cwd=cwd)

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    backend_dir = os.path.join(root_dir, "backend")

    print(f"[{platform.system()}] Starting build process...")

    # 1. Build Frontend
    print("\n--- Building Frontend ---")
    run_cmd("npm install", cwd=frontend_dir)
    run_cmd("npm run build", cwd=frontend_dir)

    # 2. Install Backend Dependencies
    print("\n--- Installing Backend Dependencies ---")
    run_cmd(f"{sys.executable} -m pip install -r requirements.txt", cwd=backend_dir)

    # 3. Build PyInstaller Executable
    print("\n--- Building Executable ---")
    sep = ";" if platform.system() == "Windows" else ":"
    
    # Check if DB exists
    db_path = os.path.join(backend_dir, "hugedomains.duckdb")
    if not os.path.exists(db_path):
        print(f"Warning: Database not found at {db_path}. Building without pre-existing DB.")
        
    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller", 
        "--name", f"hugedomain-scraper-{platform.system()}",
        "--onefile", "--windowed",
        "--add-data", f"../frontend/dist{sep}frontend/dist"
    ]

    # Dynamically bundle the database if it exists
    if os.path.exists(db_path):
        pyinstaller_cmd.extend(["--add-data", f"hugedomains.duckdb{sep}."])
        
    wal_path = os.path.join(backend_dir, "hugedomains.duckdb.wal")
    if os.path.exists(wal_path):
        pyinstaller_cmd.extend(["--add-data", f"hugedomains.duckdb.wal{sep}."])

    pyinstaller_cmd.append("run.py")

    cmd_str = " ".join(pyinstaller_cmd)
    print(f"Executing: {cmd_str}")
    run_cmd(cmd_str, cwd=backend_dir)

    print("\n✅ Build complete!")
    print(f"You can find the standalone executable in: {os.path.join(backend_dir, 'dist')}")

if __name__ == "__main__":
    main()
