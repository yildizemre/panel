"""site_config ve camera_config tablolarını oluşturur. Veritabanı yoksa /api/init ile oluşturulur."""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from app import app
from models import db
with app.app_context():
    db.create_all()
    print("Tablo kontrolü tamamlandı.")
