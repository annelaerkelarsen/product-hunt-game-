#!/usr/bin/env python3
import http.server
import socketserver
import socket
import qrcode
import os
import webbrowser
from pathlib import Path

PORT = 8000

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Create a socket to get the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "localhost"

def generate_qr_code(url):
    """Generate a QR code and save it as an image"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save("qr_code.png")
    print(f"✅ QR code saved as 'qr_code.png'")

def main():
    # Change to the script's directory
    os.chdir(Path(__file__).parent)

    # Get local IP and construct URL
    local_ip = get_local_ip()
    url = f"http://{local_ip}:{PORT}"

    print("=" * 60)
    print("📦 BARCODE SCANNER SERVER")
    print("=" * 60)
    print(f"\n🌐 Server running at: {url}")
    print(f"\n📱 To access on your iPhone:")
    print(f"   1. Make sure your iPhone is on the same WiFi network")
    print(f"   2. Open Camera app and scan the QR code (qr_code.png)")
    print(f"   3. Or manually go to: {url}")
    print(f"\n⏹️  Press Ctrl+C to stop the server\n")
    print("=" * 60)

    # Generate QR code
    generate_qr_code(url)

    # Open QR code in default image viewer
    try:
        webbrowser.open(f"file://{os.path.abspath('qr_code.png')}")
    except:
        pass

    # Start the server
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped")

if __name__ == "__main__":
    main()
