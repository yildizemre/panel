#!/usr/bin/env python3
"""
Kurulum gönderen script - mağaza/marka adı + kameralar (RTSP, resim).

Gereksinim: pip install opencv-python requests

Resim: Payload'taki RTSP adresinden OpenCV (cv2.VideoCapture) ile frame alınıp base64 gönderilir.
"""

import argparse
import base64
import json
import os
import sys

try:
    import cv2
except ImportError:
    print("Hata: opencv-python gerekli. pip install opencv-python")
    sys.exit(1)
import requests

API_BASE = "http://127.0.0.1:5000"
DIR = os.path.dirname(os.path.abspath(__file__))


def login(username: str, password: str) -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": username, "password": password},
        headers={"Content-Type": "application/json"},
    )
    r.raise_for_status()
    return r.json()["access_token"]


def capture_frame_from_rtsp(rtsp_url: str) -> str:
    """RTSP akışından bir frame al, JPEG base64 döndür."""
    if not rtsp_url or not rtsp_url.strip():
        return ""
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        return ""
    ret, frame = cap.read()
    cap.release()
    if not ret or frame is None:
        return ""
    _, buf = cv2.imencode(".jpg", frame)
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def main():
    parser = argparse.ArgumentParser(description="Kurulum gönderir: site_name + kameralar (RTSP, resim).")
    parser.add_argument("-j", "--json", type=str, required=True, help="Payload JSON (örn: payload_setup.json)")
    parser.add_argument("-u", "--user", type=str, default=None, help="Kullanıcı adı (varsayılan: payload içinde)")
    parser.add_argument("-p", "--password", type=str, default=None, help="Şifre (varsayılan: payload içinde)")
    parser.add_argument("--url", type=str, default="http://127.0.0.1:5000", help="API base URL")
    args = parser.parse_args()

    global API_BASE
    API_BASE = args.url.rstrip("/")

    path = args.json if os.path.isabs(args.json) else os.path.join(DIR, args.json)
    try:
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except FileNotFoundError:
        print(f"Hata: Dosya bulunamadı: {path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Hata: Geçersiz JSON - {e}")
        sys.exit(1)

    username = args.user or payload.get("username")
    password = args.password or payload.get("password")
    if not username or not password:
        print("Hata: Kullanıcı adı ve şifre gerekli. -u / -p veya payload içinde username, password.")
        sys.exit(1)

    site_name = payload.get("site_name") or payload.get("siteName") or ""
    cameras = payload.get("cameras") or []
    for cam in cameras:
        rtsp = cam.get("rtsp") or cam.get("rtsp_url") or ""
        if rtsp:
            cam["image_base64"] = capture_frame_from_rtsp(rtsp)
        cam.pop("image_path", None)
        cam.pop("imagePath", None)

    body = {"site_name": site_name, "cameras": cameras}

    try:
        token = login(username, password)
        r = requests.post(
            f"{API_BASE}/api/settings/setup",
            json=body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
        print(f"OK | Kurulum kaydedildi: {site_name} | {len(cameras)} kamera")
    except requests.RequestException as e:
        print(f"Hata: {e}")
        if hasattr(e, "response") and e.response is not None:
            try:
                err = e.response.json()
                print(f"  {err.get('error', e.response.text)}")
            except Exception:
                print(f"  {e.response.text}")
        sys.exit(1)


if __name__ == "__main__":
    main()
