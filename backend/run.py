import sys
import os
import multiprocessing
import threading
import time
import webbrowser
import uvicorn
import socket

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def open_browser():
    # Wait until port 8000 is accepting connections
    max_retries = 30
    for _ in range(max_retries):
        if is_port_in_use(8000):
            break
        time.sleep(0.5)
    time.sleep(0.5)
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == '__main__':
    # Required for PyInstaller multi-processing support on Windows
    multiprocessing.freeze_support()
    
    # Start a thread to open the browser automatically
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run the FastAPI app programmatically
    import main
    uvicorn.run(main.app, host="127.0.0.1", port=8000, log_level="info", workers=1)
