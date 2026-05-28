import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"
BACKEND_DIR = ROOT_DIR / "backend"


def run_cmd(cmd: list[str], cwd: Path | None = None, env: dict[str, str] | None = None) -> None:
    print("Running:", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd, env=env)


def add_data_arg(source: Path, target: str) -> str:
    separator = ";" if platform.system() == "Windows" else ":"
    return f"{source}{separator}{target}"


def main() -> None:
    python_exe = sys.executable

    print(f"[{platform.system()}] Building HugeDomains Tracker desktop executable")

    run_cmd(["npm", "install"], cwd=FRONTEND_DIR)
    run_cmd(["npm", "run", "build"], cwd=FRONTEND_DIR)

    run_cmd([python_exe, "-m", "pip", "install", "--upgrade", "pip"], cwd=BACKEND_DIR)
    run_cmd([python_exe, "-m", "pip", "install", "-r", "requirements.txt"], cwd=BACKEND_DIR)

    name = "HugeDomainsTracker"
    if platform.system() == "Windows":
        name = "HugeDomainsTracker-Windows"
    elif platform.system() == "Darwin":
        name = "HugeDomainsTracker-macOS"

    dist_dir = BACKEND_DIR / "dist"
    build_dir = BACKEND_DIR / "build"
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    if build_dir.exists():
        shutil.rmtree(build_dir)

    pyinstaller_cmd = [
        python_exe,
        "-m",
        "PyInstaller",
        "--name",
        name,
        "--windowed",
        "--noconfirm",
        "--clean",
        "--add-data",
        add_data_arg(FRONTEND_DIR / "dist", "frontend/dist"),
    ]

    if platform.system() == "Windows":
        pyinstaller_cmd.append("--onefile")

    pyinstaller_cmd.append("run.py")
    run_cmd(pyinstaller_cmd, cwd=BACKEND_DIR)

    print(f"Build complete: {dist_dir}")


if __name__ == "__main__":
    main()
