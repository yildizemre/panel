from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, ServiceHeartbeat

health_bp = Blueprint('health', __name__)

HEARTBEAT_TIMEOUT_MINUTES = 5


@health_bp.route('/status', methods=['GET'])
def status():
    return {'status': 'ok', 'service': 'vislivis'}


@health_bp.route('/heartbeat', methods=['POST'])
@jwt_required()
def heartbeat():
    """Mağaza AI servisi her 5 dakikada bir çağırır: 'ben ayaktayım'."""
    user_id = get_jwt_identity()
    now = datetime.utcnow()

    rec = ServiceHeartbeat.query.filter_by(user_id=user_id).first()
    if rec:
        rec.last_ping_at = now
    else:
        rec = ServiceHeartbeat(user_id=user_id, last_ping_at=now)
        db.session.add(rec)
    db.session.commit()
    return {'status': 'ok', 'last_ping_at': rec.last_ping_at.isoformat()}


@health_bp.route('/heartbeat/status', methods=['GET'])
@jwt_required()
def heartbeat_status():
    """Panel: mağaza servisinin son ping'ine bakar. 5 dk içindeyse yeşil, değilse kırmızı."""
    user_id = get_jwt_identity()
    rec = ServiceHeartbeat.query.filter_by(user_id=user_id).first()

    if not rec:
        return {
            'is_alive': False,
            'last_ping_at': None,
            'message': 'Henüz heartbeat gelmedi. Mağaza scripti çalışıyor mu?'
        }

    cutoff = datetime.utcnow() - timedelta(minutes=HEARTBEAT_TIMEOUT_MINUTES)
    is_alive = rec.last_ping_at >= cutoff

    return {
        'is_alive': is_alive,
        'last_ping_at': rec.last_ping_at.isoformat(),
        'message': 'Mağaza servisi ayakta' if is_alive else '5 dakikadır veri gelmiyor. Sistem çökmüş olabilir.'
    }
