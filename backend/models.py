from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')  # admin, user, brand_manager
    full_name = db.Column(db.String(120))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def to_public_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name
        }


class CustomerData(db.Model):
    __tablename__ = 'customer_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    location = db.Column(db.String(120))
    customers_inside = db.Column(db.Integer, default=0)
    male_count = db.Column(db.Integer, default=0)
    female_count = db.Column(db.Integer, default=0)
    age_18_30 = db.Column(db.Integer, default=0)
    age_30_50 = db.Column(db.Integer, default=0)
    age_50_plus = db.Column(db.Integer, default=0)
    zone_visited = db.Column(db.String(120))
    purchase_amount = db.Column(db.Float, default=0)
    is_returning = db.Column(db.Boolean, default=False)
    satisfaction_score = db.Column(db.Integer)
    camera_id = db.Column(db.String(50))
    entered = db.Column(db.Integer, default=0)
    exited = db.Column(db.Integer, default=0)


class QueueData(db.Model):
    __tablename__ = 'queue_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.String(80))
    enter_time = db.Column(db.DateTime)
    exit_time = db.Column(db.DateTime)
    wait_time = db.Column(db.Float)
    queue_position = db.Column(db.Integer)
    cashier_id = db.Column(db.String(80))  # Kasa-1, Kasa-2 vb.
    status = db.Column(db.String(20))
    total_customers = db.Column(db.Integer, default=1)  # özet için (1 kayıt = N müşteri)
    recorded_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HeatmapData(db.Model):
    __tablename__ = 'heatmap_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    zone = db.Column(db.String(120))  # erkek-giyim, kadin-giyim vb. bölge adı
    intensity = db.Column(db.Float)   # ortalama bekleme süresi (sn)
    visitor_count = db.Column(db.Integer)
    heatmap_type = db.Column(db.String(50))  # "iç" | "dış" (iç mekan / dış mekan)
    camera_id = db.Column(db.String(80))     # kamera kaynağı (opsiyonel)
    date_recorded = db.Column(db.Date)
    recorded_at = db.Column(db.DateTime)     # veri toplama zamanı (saat bazlı gruplama için)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class StaffData(db.Model):
    __tablename__ = 'staff_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    staff_id = db.Column(db.String(80))
    name = db.Column(db.String(120))
    role = db.Column(db.String(120))
    location = db.Column(db.String(120))
    activity_level = db.Column(db.Float)
    status = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SiteConfig(db.Model):
    """Kurulum: mağaza/marka adı (örn. Gallery Crystal)"""
    __tablename__ = 'site_config'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    site_name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CameraConfig(db.Model):
    """Kurulum kamera: ad, tür (Kişi Sayım, Isı Haritası, Kasa Analizi), RTSP, resim"""
    __tablename__ = 'camera_config'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120))
    camera_type = db.Column(db.String(50))  # Kişi Sayım, Isı Haritası, Kasa Analizi
    rtsp_url = db.Column(db.String(512))
    image_base64 = db.Column(db.Text)  # base64 veya data URL
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ManagedStore(db.Model):
    """Marka yöneticisi (çatı kullanıcı) hangi mağazaları yönetebilir."""
    __tablename__ = 'managed_store'
    id = db.Column(db.Integer, primary_key=True)
    manager_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    store_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ServiceHeartbeat(db.Model):
    """Mağaza AI servisinin 'ben ayaktayım' ping'lerini tutar. 5 dk içinde ping gelmezse kırmızı."""
    __tablename__ = 'service_heartbeat'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_ping_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    report_type = db.Column(db.String(50))
    report_name = db.Column(db.String(200))
    date_from = db.Column(db.Date)
    date_to = db.Column(db.Date)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
