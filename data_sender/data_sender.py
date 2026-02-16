#!/usr/bin/env python3
"""
Müşteri sayım verisi gönderen script - beymen kullanıcısı için.

Gereksinim: pip install requests

Kullanım:
  python data_sender.py -j payload.json
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


def send_customer_data(token: str, payload: dict) -> dict:
    base = {
        "entered": int(payload.get("entered") or 0),
        "exited": int(payload.get("exited") or 0),
        "customers_inside": int(payload.get("customers_inside") or 0),
        "male_count": int(payload.get("male_count") or 0),
        "female_count": int(payload.get("female_count") or 0),
        "age_18_30": int(payload.get("age_18_30") or 0),
        "age_30_50": int(payload.get("age_30_50") or 0),
        "age_50_plus": int(payload.get("age_50_plus") or 0),
    }
    for k in ("camera_id", "location", "zone_visited"):
        if payload.get(k) is not None:
            base[k] = payload[k]
    if payload.get("purchase_amount") is not None:
        base["purchase_amount"] = float(payload["purchase_amount"])
    if payload.get("timestamp"):
        base["timestamp"] = payload["timestamp"]

    r = requests.post(
        f"{API_BASE}/api/analytics/customers",
        json=base,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


def main():
    parser = argparse.ArgumentParser(description="Müşteri sayım verisi gönderir.")
    parser.add_argument("-j", "--json", type=str, required=True, help="Payload JSON (örn: payload.json)")
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

    entered = payload.get("entered", 0) or 0
    exited = payload.get("exited", 0) or 0
    if entered == 0 and exited == 0:
        print("Hata: En az entered veya exited 0'dan büyük olmalı.")
        sys.exit(1)

    try:
        token = login()
        result = send_customer_data(token, payload)
        print(f"OK | giren={entered} çıkan={exited} | id={result.get('id')}")
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
