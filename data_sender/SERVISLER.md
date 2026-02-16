# VISLIVIS Data Sender Servisleri

Bu doküman, panelimize veri gönderen tüm servisleri, kullanım örneklerini ve kurulum önerilerini açıklar.

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Kurulum Gereksinimleri](#kurulum-gereksinimleri)
3. [Heartbeat (Canlılık Sinyali)](#1-heartbeat-canlılık-sinyali)
4. [Kişi Sayım Verisi](#2-kişi-sayım-verisi)
5. [Yaş ve Cinsiyet Verisi](#3-yaş-ve-cinsiyet-verisi)
6. [Isı Haritası (Heatmap) Verisi](#4-isı-haritası-heatmap-verisi)
7. [Kuyruk Analizi Verisi](#5-kuyruk-analizi-verisi)
8. [Kurulum (Setup) Verisi](#6-kurulum-setup-verisi)
9. [Saatlik Gönderim Örnekleri](#saatlik-gönderim-örnekleri)
10. [Kurulum Senaryoları](#kurulum-senaryoları)

---

## Genel Bakış

| Servis | Script | API Endpoint | Açıklama |
|--------|--------|--------------|----------|
| Heartbeat | `heartbeat_sender.py` | `POST /api/health/heartbeat` | Mağaza AI servisinin ayakta olduğunu bildirir |
| Kişi Sayım | `data_sender.py` | `POST /api/analytics/customers` | Giriş/çıkış sayıları |
| Yaş/Cinsiyet | `data_sender_age_gender.py` | `POST /api/analytics/customers` | Demografik veri (aynı endpoint) |
| Heatmap | `data_sender_heatmap.py` | `POST /api/analytics/heatmaps` | Bölge yoğunluğu |
| Kuyruk | `data_sender_queue.py` | `POST /api/analytics/queues` | Kasa bekleme süreleri |
| Kurulum | `data_sender_setup.py` | `POST /api/settings/setup` | Kamera listesi + site bilgisi |

---

## Kurulum Gereksinimleri

```bash
pip install requests
pip install opencv-python   # Sadece data_sender_setup.py için (RTSP frame çekmek için)
```

---

## 1. Heartbeat (Canlılık Sinyali)

**Amaç:** Panel sağ alttaki "Mağaza AI" göstergesinin yeşil kalması. Her 5 dakikada bir ping atar.

### Kullanım

```bash
python heartbeat_sender.py
python heartbeat_sender.py --url http://192.168.1.100:5000
python heartbeat_sender.py -u boyner -p boyner123 --interval 5
```

### Parametreler

| Parametre | Kısa | Varsayılan | Açıklama |
|-----------|------|------------|----------|
| `--url` | `-U` | `http://127.0.0.1:5000` | API adresi |
| `-u` | `--username` | `boyner` | Kullanıcı adı |
| `-p` | `--password` | `boyner` | Şifre |
| `--interval` | - | `5` | Ping aralığı (dakika) |

### Kurulum Sayısı

- **Her mağazada 1 adet** çalışmalı (mağaza AI servisi varsa)

---

## 2. Kişi Sayım Verisi

**Amaç:** Giriş/çıkış sayıları, mağaza içi doluluk.

### Payload Örneği (`payload.json`)

```json
{
  "entered": 10,
  "exited": 8,
  "customers_inside": 42,
  "male_count": 5,
  "female_count": 5,
  "age_18_30": 3,
  "age_30_50": 5,
  "age_50_plus": 2,
  "camera_id": "kapi-1",
  "timestamp": "2026-02-16T14:00"
}
```

### Zorunlu / Önerilen Alanlar

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `entered` | int | Evet* | O saatte giren kişi sayısı |
| `exited` | int | Evet* | O saatte çıkan kişi sayısı |
| `customers_inside` | int | Hayır | Mağaza içindeki toplam kişi |
| `male_count` | int | Hayır | Erkek sayısı |
| `female_count` | int | Hayır | Kadın sayısı |
| `age_18_30` | int | Hayır | 18–30 yaş |
| `age_30_50` | int | Hayır | 30–50 yaş |
| `age_50_plus` | int | Hayır | 50+ yaş |
| `camera_id` | string | Hayır | Kamera tanımı |
| `timestamp` | string | Hayır | `YYYY-MM-DDTHH:00` (UTC) |

\* `entered` veya `exited` en az biri 0'dan büyük olmalı.

### Kullanım

```bash
python data_sender.py -j payload.json
python data_sender.py -j payload.json --url http://panel.example.com
```

### Saatlik Gönderim Örneği

Saat 10:00–22:00 arası her saat başı göndermek için (cron):

```bash
# Her saat başı (0. dakikada)
0 * * * * cd /path/to/data_sender && python data_sender.py -j payload.json
```

Payload'u dinamik yapmak için basit bir script:

```bash
#!/bin/bash
# hourly_customer.sh
TS=$(date +%Y-%m-%d)T$(date +%H):00
# Örnek: AI'dan gelen sayıları buraya koy
echo "{\"entered\": 12, \"exited\": 10, \"timestamp\": \"$TS\"}" > payload_temp.json
python data_sender.py -j payload_temp.json
```

---

## 3. Yaş ve Cinsiyet Verisi

**Amaç:** Giriş/çıkış + demografik dağılım (gece Moondream raporu vb.).

### Payload Örneği (`payload_age_gender.json`)

```json
{
  "timestamp": "2026-02-16T14:00",
  "entered": 15,
  "exited": 12,
  "male_count": 6,
  "female_count": 9,
  "age_18_30": 7,
  "age_30_50": 5,
  "age_50_plus": 3
}
```

Sadece demografik (giriş/çıkış olmadan):

```json
{
  "timestamp": "2026-02-16T14:00",
  "male_count": 6,
  "female_count": 4,
  "age_18_30": 4,
  "age_30_50": 4,
  "age_50_plus": 2
}
```

### Kullanım

```bash
python data_sender_age_gender.py -j payload_age_gender.json
```

### Saatlik Gönderim

`data_sender.py` ile aynı mantık; saatlik JSON üretip gönderin.

---

## 4. Isı Haritası (Heatmap) Verisi

**Amaç:** Bölge bazlı ziyaretçi yoğunluğu ve ortalama geçirilen süre.

### Payload Örneği (`payload_heatmap.json`)

```json
{
  "zone": "kadin-giyim",
  "visitor_count": 122,
  "intensity": 45.5,
  "camera_id": "kamera-2",
  "timestamp": "2026-02-16T14:00"
}
```

### Alanlar

| Alan | Tip | Açıklama |
|------|-----|----------|
| `zone` | string | Bölge adı (erkek-giyim, kadin-giyim, aksesuar vb.) |
| `visitor_count` | int | O saatte o bölgedeki ziyaretçi sayısı |
| `intensity` | float | Ortalama geçirilen süre (saniye) |
| `camera_id` | string | Opsiyonel |
| `timestamp` | string | `YYYY-MM-DDTHH:00` |

### Bölge Örnekleri

- `erkek-giyim`
- `kadin-giyim`
- `aksesuar`
- `kasa-alani`
- `vitrin`

### Kullanım

```bash
python data_sender_heatmap.py -j payload_heatmap.json
```

### Saatlik Gönderim Örneği

Her bölge için ayrı payload; her saat gönderin:

```bash
# Örnek: 3 bölge için saatlik
TS=$(date +%Y-%m-%d)T$(date +%H):00
for ZONE in erkek-giyim kadin-giyim aksesuar; do
  echo "{\"zone\":\"$ZONE\",\"visitor_count\":50,\"intensity\":35.2,\"timestamp\":\"$TS\"}" > payload_heatmap_temp.json
  python data_sender_heatmap.py -j payload_heatmap_temp.json
done
```

### Kurulum Sayısı

- **Bölge sayısı kadar** farklı zone ile çağrı (her kamera/bölge için 1)
- Örn: 3 bölge varsa saatte 3 istek (veya tek script ile 3 kez çağrı)

---

## 5. Kuyruk Analizi Verisi

**Amaç:** Kasa bazlı müşteri sayısı ve ortalama bekleme süresi.

### Payload Örneği (`payload_queue.json`)

```json
{
  "cashier_id": "Kasa-2",
  "total_customers": 14,
  "wait_time": 44.5,
  "timestamp": "2026-02-16T14:00"
}
```

### Alanlar

| Alan | Tip | Açıklama |
|------|-----|----------|
| `cashier_id` | string | Kasa adı (Kasa-1, Kasa-2 vb.) |
| `total_customers` | int | O saatte işlenen müşteri sayısı |
| `wait_time` | float | Ortalama bekleme süresi (saniye) |
| `timestamp` | string | `YYYY-MM-DDTHH:00` |

### Kullanım

```bash
python data_sender_queue.py -j payload_queue.json
```

### Saatlik Gönderim Örneği

Her kasa için ayrı istek:

```bash
# 4 kasa varsa
TS=$(date +%Y-%m-%d)T$(date +%H):00
for KASA in 1 2 3 4; do
  echo "{\"cashier_id\":\"Kasa-$KASA\",\"total_customers\":12,\"wait_time\":38.0,\"timestamp\":\"$TS\"}" > payload_queue_temp.json
  python data_sender_queue.py -j payload_queue_temp.json
done
```

### Kurulum Sayısı

- **Kasa sayısı kadar** (her kasa için 1 payload / saat)

---

## 6. Kurulum (Setup) Verisi

**Amaç:** Mağaza adı + kamera listesi (RTSP, tip, ad). OpenCV ile RTSP’den frame alınıp base64 gönderilir.

### Payload Örneği (`payload_setup.json`)

```json
{
  "username": "boyner",
  "password": "boyner",
  "site_name": "Boyner Magazcılık AŞ - AVM İstanbul",
  "cameras": [
    {
      "name": "Giriş - Kişi Sayım",
      "type": "Kişi Sayım",
      "rtsp": "rtsp://192.168.1.10/stream1"
    },
    {
      "name": "Isı Haritası - Erkek Giyim",
      "type": "Isı Haritası",
      "rtsp": "rtsp://192.168.1.10/stream2"
    },
    {
      "name": "Isı Haritası - Kadın Giyim",
      "type": "Isı Haritası",
      "rtsp": "rtsp://192.168.1.10/stream3"
    }
  ]
}
```

### Alanlar

| Alan | Açıklama |
|------|----------|
| `username` | Panel kullanıcı adı |
| `password` | Panel şifresi |
| `site_name` | Mağaza/marka adı |
| `cameras` | Kamera listesi |
| `cameras[].name` | Kamera adı |
| `cameras[].type` | `Kişi Sayım` veya `Isı Haritası` |
| `cameras[].rtsp` | RTSP akış adresi |

### Kullanım

```bash
python data_sender_setup.py -j payload_setup.json
python data_sender_setup.py -j payload_setup.json -u boyner -p boyner123 --url http://panel.example.com
```

### Kurulum Sayısı

- **Mağaza başına 1 kez** (veya kamera değişince tekrar)

---

## Saatlik Gönderim Örnekleri

### Örnek 1: Tüm veriler saat 10–22 arası

```bash
#!/bin/bash
# run_hourly.sh - Her saat başı çalıştırılır (cron: 0 10-22 * * *)

BASE="/path/to/data_sender"
TS=$(date +%Y-%m-%d)T$(date +%H):00

# 1. Kişi sayımı (1 istek) - ENTERED/EXITED AI'dan gelir
ENTERED=${ENTERED:-10}
EXITED=${EXITED:-8}
echo "{\"entered\":$ENTERED,\"exited\":$EXITED,\"timestamp\":\"$TS\"}" > "$BASE/payload_temp.json"
python "$BASE/data_sender.py" -j "$BASE/payload_temp.json"

# 2. Heatmap - her bölge için
for ZONE in erkek-giyim kadin-giyim aksesuar; do
  echo "{\"zone\":\"$ZONE\",\"visitor_count\":50,\"intensity\":40,\"timestamp\":\"$TS\"}" > "$BASE/payload_heatmap_temp.json"
  python "$BASE/data_sender_heatmap.py" -j "$BASE/payload_heatmap_temp.json"
done

# 3. Kuyruk - her kasa için
for K in 1 2 3; do
  echo "{\"cashier_id\":\"Kasa-$K\",\"total_customers\":10,\"wait_time\":35,\"timestamp\":\"$TS\"}" > "$BASE/payload_queue_temp.json"
  python "$BASE/data_sender_queue.py" -j "$BASE/payload_queue_temp.json"
done
```

### Örnek 2: Python ile saatlik döngü

```python
# hourly_sender.py
import subprocess
import time
from datetime import datetime

BASE = "/path/to/data_sender"
ZONES = ["erkek-giyim", "kadin-giyim", "aksesuar"]
CASHIERS = ["Kasa-1", "Kasa-2", "Kasa-3"]

def send_all():
    ts = datetime.now().strftime("%Y-%m-%dT%H:00")
    # Kişi sayımı
    with open(f"{BASE}/payload_temp.json", "w") as f:
        f.write(f'{{"entered":12,"exited":10,"timestamp":"{ts}"}}')
    subprocess.run(["python", f"{BASE}/data_sender.py", "-j", f"{BASE}/payload_temp.json"], check=True)
    # Heatmap
    for z in ZONES:
        with open(f"{BASE}/payload_heatmap_temp.json", "w") as f:
            f.write(f'{{"zone":"{z}","visitor_count":50,"intensity":40,"timestamp":"{ts}"}}')
        subprocess.run(["python", f"{BASE}/data_sender_heatmap.py", "-j", f"{BASE}/payload_heatmap_temp.json"], check=True)
    # Kuyruk
    for c in CASHIERS:
        with open(f"{BASE}/payload_queue_temp.json", "w") as f:
            f.write(f'{{"cashier_id":"{c}","total_customers":10,"wait_time":35,"timestamp":"{ts}"}}')
        subprocess.run(["python", f"{BASE}/data_sender_queue.py", "-j", f"{BASE}/payload_queue_temp.json"], check=True)

while True:
    send_all()
    time.sleep(3600)  # 1 saat
```

---

## Kurulum Senaryoları

### Senaryo A: Tek Mağaza (1 kamera, 2 kasa)

| Servis | Adet | Sıklık |
|--------|------|--------|
| `heartbeat_sender.py` | 1 | Her 5 dk |
| `data_sender.py` | 1 | Saatlik |
| `data_sender_heatmap.py` | 1 (zone: genel) | Saatlik |
| `data_sender_queue.py` | 2 (Kasa-1, Kasa-2) | Saatlik |
| `data_sender_setup.py` | 1 | İlk kurulumda 1 kez |

### Senaryo B: Tek Mağaza (3 kamera, 4 kasa, 3 bölge)

| Servis | Adet | Sıklık |
|--------|------|--------|
| `heartbeat_sender.py` | 1 | Her 5 dk |
| `data_sender.py` | 1–3 (kamera bazlı) | Saatlik |
| `data_sender_heatmap.py` | 3 (her bölge) | Saatlik |
| `data_sender_queue.py` | 4 (her kasa) | Saatlik |
| `data_sender_setup.py` | 1 | İlk kurulumda 1 kez |

### Senaryo C: 5 Mağaza (franchise / marka)

Her mağaza için ayrı kullanıcı + ayrı `data_sender` klasörü veya ortak script + farklı `-u`/`-p`:

```bash
# Mağaza 1
python data_sender.py -j payload.json -u magaza1 -p pass1

# Mağaza 2
python data_sender.py -j payload.json -u magaza2 -p pass2
```

| Mağaza | Heartbeat | Kişi Sayım | Heatmap | Kuyruk | Setup |
|--------|-----------|------------|---------|--------|-------|
| 1 | 1 | 1 | 2 | 3 | 1 |
| 2 | 1 | 1 | 2 | 2 | 1 |
| ... | ... | ... | ... | ... | ... |

---

## Cron Örnekleri

```cron
# Her 5 dakikada heartbeat
*/5 * * * * cd /opt/vislivis/data_sender && python heartbeat_sender.py

# Saat 10–22 arası, her saat başı tüm analitik veriler
0 10-22 * * * /opt/vislivis/data_sender/run_hourly.sh
```

---

## Notlar

- `timestamp` formatı: `YYYY-MM-DDTHH:00` (örn: `2026-02-16T14:00`)
- Tüm scriptler varsayılan olarak `http://127.0.0.1:5000` kullanır; `--url` ile değiştirilebilir
- Kullanıcı/şifre: script içindeki `USERNAME`/`PASSWORD` veya ilgili parametreler
- Setup için `opencv-python` gerekir (RTSP’den frame almak için)
