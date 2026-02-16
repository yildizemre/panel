#!/usr/bin/env python3
"""service_heartbeat tablosunu oluşturur."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, ServiceHeartbeat

with app.app_context():
    db.create_all()
    print("OK: service_heartbeat tablosu hazır.")
