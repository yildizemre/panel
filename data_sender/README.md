# Data Sender Scripts

beymen kullanıcısı için API'ye veri gönderen scriptler.

## Gereksinim

```bash
pip install requests
pip install opencv-python   # data_sender_setup.py için (resim okuma)
```

## Scriptler

| Script | Açıklama |
|--------|----------|
| `data_sender.py` | Müşteri sayımı (giren/çıkan) |
| `data_sender_age_gender.py` | Yaş ve cinsiyet verisi |
| `data_sender_heatmap.py` | Isı haritası (bölge yoğunluğu) |
| `data_sender_queue.py` | Kuyruk analizi (Kasa-1, Kasa-2 vb.) |
| `data_sender_setup.py` | Kurulum (mağaza adı + kameralar RTSP/resim) |

## Kullanım

```bash
cd data_sender

# Müşteri sayımı
python data_sender.py -j payload.json

# Yaş + cinsiyet
python data_sender_age_gender.py -j payload_age_gender.json

# Isı haritası (erkek-giyim / kadin-giyim vb.)
python data_sender_heatmap.py -j payload_heatmap.json

# Kuyruk analizi (Kasa-1, Kasa-2 vb.)
python data_sender_queue.py -j payload_queue.json

# Kurulum (Gallery Crystal vb. - kameralar, RTSP, resim)
python data_sender_setup.py -j payload_setup.json
```

## Setup (Kurulum) Payload

Admin ile kullanıcı oluştur (gallery_cristal). Sonra o kullanıcı ile:

```json
{
  "username": "gallery_cristal",
  "password": "sifre123",
  "site_name": "Gallery Crystal",
  "cameras": [
    {
      "name": "Giriş - Kişi Sayım",
      "type": "Kişi Sayım",
      "rtsp": "rtsp://192.168.1.101/stream1",
      "image_path": "giris.jpg"
    }
  ]
}
```

`image_path`: Resim dosyası (data_sender klasöründe veya tam yol). `type`: Kişi Sayım, Isı Haritası, Kasa Analizi.

## Queue Payload Örnekleri

**Kasa-1:**
```json
{"cashier_id": "Kasa-1", "total_customers": 12, "wait_time": 45.5, "timestamp": "2026-02-16T14:00"}
```

**Kasa-2:**
```json
{"cashier_id": "Kasa-2", "total_customers": 8, "wait_time": 32, "timestamp": "2026-02-16T14:00"}
```

Panelde **Tüm Kasalar** seçilince veriler toplanır.

## Heatmap Payload Örnekleri

**erkek-giyim** (1. kamera):
```json
{"zone": "erkek-giyim", "visitor_count": 12, "intensity": 45.5, "timestamp": "2026-02-16T14:00"}
```

**kadin-giyim** (2. kamera):
```json
{"zone": "kadin-giyim", "visitor_count": 8, "intensity": 32, "timestamp": "2026-02-16T14:00"}
```

`intensity`: Ortalama geçirilen süre (saniye)

Panelde **Tüm Bölgeler** seçilince veriler toplanır.
