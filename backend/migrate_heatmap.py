"""HeatmapData tablosuna recorded_at ve camera_id sütunlarını ekler. Bir kez çalıştırın."""
import sqlite3
import os

for candidate in [
    os.path.join(os.path.dirname(__file__), 'instance', 'vislivis.db'),
    os.path.join(os.path.dirname(__file__), 'vislivis.db'),
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'vislivis.db'),
]:
    db_path = candidate
    if os.path.exists(db_path):
        break
if not os.path.exists(db_path):
    print("Veritabanı bulunamadı. Önce backend'i çalıştırıp /api/init yapın.")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
added = []
try:
    cur.execute("PRAGMA table_info(heatmap_data)")
    cols = [r[1] for r in cur.fetchall()]
    if 'recorded_at' not in cols:
        cur.execute("ALTER TABLE heatmap_data ADD COLUMN recorded_at DATETIME")
        added.append('recorded_at')
    if 'camera_id' not in cols:
        cur.execute("ALTER TABLE heatmap_data ADD COLUMN camera_id VARCHAR(80)")
        added.append('camera_id')
    conn.commit()
    if added:
        print(f"Eklendi: {', '.join(added)}")
    else:
        print("Tüm sütunlar zaten mevcut.")
except Exception as e:
    print(f"Hata: {e}")
finally:
    conn.close()
