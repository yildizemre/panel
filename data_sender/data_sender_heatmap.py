#!/usr/bin/env python3
"""
Isı haritası (heatmap) verisi gönderen script.

- zone: Bölge adı (erkek-giyim, kadin-giyim vb.) – her kamera/script farklı zone gönderir
- zone: Bölge adı (erkek-giyim, kadin-giyim vb.)
- intensity: Ortalama geçirilen zaman (saniye)

Kullanım:
  python data_sender_heatmap.py -j payload_heatmap.json
"""

import argparse
import json
import os
import requests
import sys

API_BASE = "http://127.0.0.1:5000"
USERNAME = "beymen"
PASSWORD = "beymen"

DIR = os.path.dirname(os.path.abspath(__file__))


def login() -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
    )
    r.raise_for_status()
    return r.json()["access_token"]


def send(token: str, payload: dict) -> dict:
    base = {
        "zone": payload.get("zone") or "genel",
        "visitor_count": int(payload.get("visitor_count") or 0),
        "intensity": float(payload.get("intensity") or 0),
    }
    if payload.get("camera_id"):
        base["camera_id"] = payload["camera_id"]
    if payload.get("timestamp"):
        base["timestamp"] = payload["timestamp"]
    if payload.get("date_recorded"):
        base["date_recorded"] = payload["date_recorded"]

    r = requests.post(
        f"{API_BASE}/api/analytics/heatmaps",
        json=base,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


def main():
    parser = argparse.ArgumentParser(description="Isı haritası verisi gönderir.")
    parser.add_argument("-j", "--json", type=str, required=True, help="Payload JSON (örn: payload_heatmap.json)")
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

    zone = payload.get("zone") or "genel"
    vc = int(payload.get("visitor_count") or 0)
    intensity = float(payload.get("intensity") or 0)

    try:
        token = login()
        result = send(token, payload)
        print(f"OK | zone={zone} visitor_count={vc} ort_süre={intensity}sn | id={result.get('id')}")
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
