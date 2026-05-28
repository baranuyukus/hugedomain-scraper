import multiprocessing
import socket
import threading
import time
import webbrowser

import uvicorn


HOST = "127.0.0.1"
PORT = 8000


def is_port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((HOST, port)) == 0


def wait_for_server(port: int, timeout_seconds: float = 30.0) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if is_port_open(port):
            return True
        time.sleep(0.25)
    return False


def run_server(server: uvicorn.Server) -> None:
    server.run()


def main() -> None:
    multiprocessing.freeze_support()

    import main as api_main

    config = uvicorn.Config(
        api_main.app,
        host=HOST,
        port=PORT,
        log_level="warning",
        workers=1,
    )
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=run_server, args=(server,), daemon=True)
    server_thread.start()

    url = f"http://{HOST}:{PORT}"
    wait_for_server(PORT)

    try:
        import webview

        window = webview.create_window(
            "HugeDomains Tracker",
            url,
            width=1280,
            height=860,
            min_size=(1100, 720),
        )
        webview.start()
    except Exception:
        webbrowser.open(url)
        try:
            while server_thread.is_alive():
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        server.should_exit = True
        server_thread.join(timeout=5)


if __name__ == "__main__":
    main()
