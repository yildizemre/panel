"""QueueData tablosuna recorded_at ve total_customers sütunlarını ekler. Bir kez çalıştırın."""
import sqlite3
import os

for candidate in [
    os.path.join(os.path.dirname(__file__), 'instance', 'vislivis.db'),
    os.path.join(os.path.dirname(__file__), 'vislivis.db'),
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'vislivis.db'),
]:
    if os.path.exists(candidate):
        db_path = candidate
        break
else:
    db_path = None

if not db_path or not os.path.exists(db_path):
    print("Veritabanı bulunamadı.")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
added = []
try:
    cur.execute("PRAGMA table_info(queue_data)")
    cols = [r[1] for r in cur.fetchall()]
    if 'recorded_at' not in cols:
        cur.execute("ALTER TABLE queue_data ADD COLUMN recorded_at DATETIME")
        added.append('recorded_at')
    if 'total_customers' not in cols:
        cur.execute("ALTER TABLE queue_data ADD COLUMN total_customers INTEGER DEFAULT 1")
        added.append('total_customers')
    conn.commit()
    if added:
        print(f"Eklendi: {', '.join(added)}")
    else:
        print("Tüm sütunlar zaten mevcut.")
except Exception as e:
    print(f"Hata: {e}")
finally:
    conn.close()
