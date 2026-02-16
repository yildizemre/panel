#!/usr/bin/env python3
"""
Kuyruk analizi verisi gönderen script.

- cashier_id: Kasa adı (Kasa-1, Kasa-2 vb.)
- total_customers: O saatte işlenen müşteri sayısı
- wait_time: Ortalama bekleme süresi (saniye)
- Tüm Kasalar: Sağ üstten seçilince tüm kasalar toplanır

Kullanım:
  python data_sender_queue.py -j payload_queue.json
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
        "cashier_id": payload.get("cashier_id") or "Kasa-1",
        "total_customers": int(payload.get("total_customers") or 1),
        "wait_time": float(payload.get("wait_time") or 0),
        "status": "completed",
    }
    if payload.get("timestamp"):
        base["timestamp"] = payload["timestamp"]

    r = requests.post(
        f"{API_BASE}/api/analytics/queues",
        json=base,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


def main():
    parser = argparse.ArgumentParser(description="Kuyruk analizi verisi gönderir.")
    parser.add_argument("-j", "--json", type=str, required=True, help="Payload JSON (örn: payload_queue.json)")
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

    cashier = payload.get("cashier_id") or "Kasa-1"
    total = int(payload.get("total_customers") or 1)
    wait = float(payload.get("wait_time") or 0)

    try:
        token = login()
        result = send(token, payload)
        print(f"OK | kasa={cashier} müşteri={total} ort_bekleme={wait}sn | id={result.get('id')}")
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
