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
    
    python_exe = sys.executable
    venv_exe = os.path.join(backend_dir, "venv", "bin", "python3")
    if platform.system() == "Windows":
        venv_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        
    if os.path.exists(venv_exe):
        print(f"Detected virtual environment at {venv_exe}")
        python_exe = venv_exe
        
    run_cmd(f"{python_exe} -m pip install -r requirements.txt", cwd=backend_dir)

    # 3. Build PyInstaller Executable
    print("\n--- Building Executable ---")
    sep = ";" if platform.system() == "Windows" else ":"
    
    # Check if DB exists
    db_path = os.path.join(backend_dir, "hugedomains.duckdb")
    if not os.path.exists(db_path):
        print(f"Warning: Database not found at {db_path}. Building without pre-existing DB.")
        
    pyinstaller_cmd = [
        python_exe, "-m", "PyInstaller", 
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
