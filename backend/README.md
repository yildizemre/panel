# Vislivis Backend

Python Flask backend for the Vislivis retail analytics panel.

## Kurulum

```bash
cd backend
pip install -r requirements.txt
```

## Veritabanı Başlatma

Backend'i ilk çalıştırdığınızda veya veritabanını sıfırlamak için:

```bash
curl -X POST http://127.0.0.1:5000/api/init
```

Bu işlem:
- SQLite veritabanını (`vislivis.db`) oluşturur
- Admin kullanıcıyı oluşturur: **admin** / **admin**

## Çalıştırma

```bash
python app.py
```

Backend `http://127.0.0.1:5000` adresinde çalışacaktır.

## API Özeti

- `POST /api/init` - Veritabanı başlatma
- `POST /api/auth/login` - Giriş (username veya email + password)
- `POST /api/auth/register` - Kayıt
- `GET /api/dashboard/weekly-overview` - Dashboard verileri (JWT gerekli)
- `GET/POST /api/analytics/customers` - Müşteri verileri
- `GET/POST /api/analytics/queues` - Kuyruk verileri
- `GET/POST /api/analytics/heatmaps` - Isı haritası verileri
- `GET/POST /api/analytics/staff` - Personel verileri
- `GET /api/admin/users` - Üye listesi (sadece admin)
- `POST /api/admin/users` - Yeni kullanıcı (admin)
- `PUT /api/admin/users/:id` - Kullanıcı güncelle (admin)
- `DELETE /api/admin/users/:id` - Kullanıcı sil (admin)

## Multi-Tenancy

Her kullanıcının verileri `user_id` ile izole edilmiştir. Giriş yapan kullanıcı sadece kendi paneline ait verileri görür.
