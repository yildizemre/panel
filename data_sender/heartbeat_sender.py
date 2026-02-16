#!/usr/bin/env python3
"""
Mağaza AI servisi "ben ayaktayım" heartbeat scripti.

Her 5 dakikada bir API'ye ping atar. Panel sağ alttaki "Mağaza AI" göstergesi
yeşil/kırmızı buna göre güncellenir. 5 dakika içinde ping gelmezse kırmızı.

Gereksinim: pip install requests

Kullanım:
  python heartbeat_sender.py
  python heartbeat_sender.py --url http://192.168.1.100:5000
  python heartbeat_sender.py -u boyner -p boyner123
"""

import argparse
import requests
import sys
import time

API_BASE = "http://127.0.0.1:5000"
USERNAME = "boyner"
PASSWORD = "boyner"
INTERVAL_MINUTES = 5


def login(base: str, username: str, password: str) -> str:
    r = requests.post(
        f"{base}/api/auth/login",
        json={"username": username, "password": password},
        headers={"Content-Type": "application/json"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def send_heartbeat(base: str, token: str) -> bool:
    r = requests.post(
        f"{base}/api/health/heartbeat",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    return r.status_code == 200


def main():
    parser = argparse.ArgumentParser(description="Mağaza AI heartbeat - her 5 dakikada bir 'ben ayaktayım' sinyali gönderir.")
    parser.add_argument("--url", "-U", type=str, default="http://127.0.0.1:5000", help="API base URL")
    parser.add_argument("-u", "--username", type=str, default=USERNAME, help="Kullanıcı adı")
    parser.add_argument("-p", "--password", type=str, default=PASSWORD, help="Şifre")
    parser.add_argument("--interval", type=int, default=INTERVAL_MINUTES, help="Ping aralığı (dakika)")
    args = parser.parse_args()

    base = args.url.rstrip("/")
    interval_sec = args.interval * 60

    print(f"[Heartbeat] Başlatılıyor: {base} | kullanıcı: {args.username} | aralık: {args.interval} dk")
    print("[Heartbeat] Durdurmak için Ctrl+C")

    token = None
    while True:
        try:
            if not token:
                token = login(base, args.username, args.password)
                print(f"[Heartbeat] Giriş başarılı")

            if send_heartbeat(base, token):
                print(f"[Heartbeat] OK - sinyal gönderildi")
            else:
                token = None  # Yeniden login dene
                print("[Heartbeat] 401/403 - token yenilenecek")
        except requests.RequestException as e:
            token = None
            print(f"[Heartbeat] Hata: {e}")
            if hasattr(e, "response") and e.response is not None:
                if e.response.status_code in (401, 403):
                    print("[Heartbeat] Token süresi dolmuş olabilir, yeniden giriş yapılıyor...")
        except KeyboardInterrupt:
            print("\n[Heartbeat] Durduruldu.")
            sys.exit(0)

        time.sleep(interval_sec)


if __name__ == "__main__":
    main()
