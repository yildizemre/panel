# VISLIVIS Panel - VDS Kurulum Rehberi

Bu rehber, uygulamayı Ubuntu 22.04 LTS VDS üzerinde production ortamına kurmanız için hazırlanmıştır.

---

## Gereksinimler

- Ubuntu 22.04 LTS (veya 20.04)
- Root veya sudo yetkisi
- Minimum 1 GB RAM, 20 GB disk
- Domain veya sunucu IP adresi

---

## Adım 1: Sistem Güncellemesi

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Adım 2: Gerekli Paketlerin Kurulumu

```bash
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx nodejs npm git
```

Node.js 18+ için (Ubuntu 22.04 varsayılan yeterli olabilir, kontrol edin):

```bash
node -v   # v18+ olmalı
npm -v
```

---

## Adım 3: Uygulama Dizininin Oluşturulması

```bash
sudo mkdir -p /var/www/vislivis
sudo chown $USER:$USER /var/www/vislivis
cd /var/www/vislivis
```

---

## Adım 4: Projeyi Yükleme

**Git ile (repo varsa):**
```bash
git clone https://github.com/KULLANICI/vislivis-panel.git .
```

**Manuel yükleme (FTP/SFTP/SCP):**
Proje dosyalarını `/var/www/vislivis` içine kopyalayın. Klasör yapısı şöyle olmalı:

```
/var/www/vislivis/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── models.py
│   ├── requirements.txt
│   └── ...
├── src/
├── index.html
├── package.json
├── vite.config.ts
└── ...
```

---

## Adım 5: Backend Kurulumu

```bash
cd /var/www/vislivis
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
pip install gunicorn
```

### Ortam Değişkenleri (.env)

```bash
nano /var/www/vislivis/backend/.env
```

Şu satırları ekleyin (değerleri kendi ortamınıza göre değiştirin):

```env
SECRET_KEY=güçlü-bir-rastgele-anahtar-buraya
JWT_SECRET_KEY=güçlü-jwt-anahtari-buraya
DATABASE_URL=sqlite:///vislivis.db
FLASK_ENV=production
```

`SECRET_KEY` üretmek için:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Veritabanı Başlatma

```bash
cd /var/www/vislivis
source venv/bin/activate
cd backend
export $(grep -v '^#' .env 2>/dev/null | xargs)
python3 -c "
from app import app
with app.app_context():
    from models import db
    db.create_all()
    from models import User
    if not User.query.filter_by(username='admin').first():
        u = User(username='admin', email='admin@vislivis.com', role='admin')
        u.set_password('admin')
        db.session.add(u)
        db.session.commit()
        print('Admin oluşturuldu: admin / admin')
"
```

Alternatif: API ile init:
```bash
curl -X POST http://127.0.0.1:5000/api/init
```

---

## Adım 6: Frontend Build

```bash
cd /var/www/vislivis
npm install
```

API adresini production için ayarlayın. Build sırasında `VITE_API_URL` kullanılacak:

```bash
# Kendi domain veya IP'nizi yazın
export VITE_API_URL=https://panel.example.com
npm run build
```

Veya `.env.production` dosyası oluşturun:

```bash
echo "VITE_API_URL=https://panel.example.com" > .env.production
npm run build
```

Build çıktısı `dist/` klasöründe oluşur.

---

## Adım 7: Gunicorn Systemd Servisi

```bash
sudo nano /etc/systemd/system/vislivis.service
```

İçeriği:

```ini
[Unit]
Description=VISLIVIS Backend (Gunicorn)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/vislivis
Environment="PATH=/var/www/vislivis/venv/bin"
EnvironmentFile=/var/www/vislivis/backend/.env
ExecStart=/var/www/vislivis/venv/bin/gunicorn --workers 2 --bind 127.0.0.1:5000 "backend.app:app"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Not: `www-data` kullanıyorsanız önce sahipliği değiştirin:

```bash
sudo chown -R www-data:www-data /var/www/vislivis
```

Sadece kendi kullanıcınızla çalıştıracaksanız `User=` ve `Group=` değerlerini kendi kullanıcınız yapın.

```bash
sudo systemctl daemon-reload
sudo systemctl enable vislivis
sudo systemctl start vislivis
sudo systemctl status vislivis
```

---

## Adım 8: Nginx Yapılandırması

```bash
sudo nano /etc/nginx/sites-available/vislivis
```

**HTTP (önce test için):**

```nginx
server {
    listen 80;
    server_name panel.example.com;   # veya sunucu IP'niz

    root /var/www/vislivis/dist;
    index index.html;

    # Frontend - SPA için tüm istekleri index.html'e yönlendir
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health / heartbeat için
    location /api/health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Siteyi etkinleştirin:

```bash
sudo ln -s /etc/nginx/sites-available/vislivis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Adım 9: SSL (HTTPS) - Let's Encrypt

Domain kullanıyorsanız:

```bash
sudo certbot --nginx -d panel.example.com
```

Certbot Nginx config'i otomatik günceller. Yenileme için cron zaten eklenir.

---

## Adım 10: Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## Özet Komut Listesi (Kopyala-Yapıştır)

Aşağıdakileri sırayla uygulayabilirsiniz. `panel.example.com` ve dizinleri kendi ortamınıza göre değiştirin.

```bash
# 1. Paketler
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx nodejs npm

# 2. Dizin
sudo mkdir -p /var/www/vislivis
sudo chown $USER:$USER /var/www/vislivis

# 3. Proje dosyalarını /var/www/vislivis içine kopyalayın (git clone veya scp)

# 4. Backend
cd /var/www/vislivis
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
pip install gunicorn

# 5. .env (SECRET_KEY ve JWT_SECRET_KEY için aşağıdaki komutları çalıştırın)
SK=$(python3 -c "import secrets; print(secrets.token_hex(32))")
JK=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo "SECRET_KEY=$SK" > backend/.env
echo "JWT_SECRET_KEY=$JK" >> backend/.env
echo "DATABASE_URL=sqlite:///vislivis.db" >> backend/.env
echo "FLASK_ENV=production" >> backend/.env

# 6. DB init
cd /var/www/vislivis/backend && source ../venv/bin/activate && python3 -c "
from app import app
with app.app_context():
    from models import db
    db.create_all()
    from models import User
    if not User.query.filter_by(username='admin').first():
        u = User(username='admin', email='admin@vislivis.com', role='admin')
        u.set_password('admin')
        db.session.add(u)
    db.session.commit()
    print('Admin: admin/admin')
"
cd /var/www/vislivis

# 7. Frontend
cd /var/www/vislivis
export VITE_API_URL=https://panel.example.com
npm install && npm run build

# 8. systemd + nginx (yukarıdaki dosya içeriklerini oluşturun)
sudo chown -R www-data:www-data /var/www/vislivis
sudo systemctl enable vislivis && sudo systemctl start vislivis
sudo ln -s /etc/nginx/sites-available/vislivis /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. SSL (domain varsa)
# sudo certbot --nginx -d panel.example.com
```

---

## Kontrol ve Sorun Giderme

| Komut | Açıklama |
|-------|----------|
| `sudo systemctl status vislivis` | Backend durumu |
| `sudo journalctl -u vislivis -f` | Backend logları |
| `curl http://127.0.0.1:5000/api/health/heartbeat/status` | API test |
| `sudo nginx -t` | Nginx config test |
| `ls -la /var/www/vislivis/dist/` | Build çıktısı kontrolü |

---

## Güncelleme

```bash
cd /var/www/vislivis
git pull   # veya dosyaları yeniden kopyalayın
source venv/bin/activate
pip install -r backend/requirements.txt
npm install && npm run build
sudo systemctl restart vislivis
sudo systemctl reload nginx
```

---

## data_sender (Mağaza Tarafı)

Mağazalardaki scriptler panel API'sine bağlanır. `--url` ile panel adresini verin:

```bash
python heartbeat_sender.py --url https://panel.example.com -u magaza1 -p sifre
python data_sender.py -j payload.json --url https://panel.example.com
```

Script içindeki `USERNAME` ve `PASSWORD` değerlerini veya `-u` / `-p` parametrelerini mağaza kullanıcısına göre ayarlayın.
