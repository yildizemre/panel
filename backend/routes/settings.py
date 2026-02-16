from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User, SiteConfig, CameraConfig, ManagedStore
from user_context import get_settings_user_id, get_resolved_user_ids

settings_bp = Blueprint('settings', __name__)




@settings_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = User.query.get_or_404(get_jwt_identity())
    return user.to_dict()


@settings_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = User.query.get_or_404(get_jwt_identity())
    data = request.get_json()
    if 'fullName' in data:
        user.full_name = data['fullName']
    if 'email' in data:
        if data['email'] != user.email and User.query.filter_by(email=data['email']).first():
            return {'error': 'E-posta zaten kullanılıyor'}, 400
        user.email = data['email']
    db.session.commit()
    return user.to_dict()


@settings_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    user = User.query.get_or_404(get_jwt_identity())
    data = request.get_json()
    current = data.get('currentPassword')
    new_pass = data.get('newPassword')
    if not current or not new_pass:
        return {'error': 'Mevcut ve yeni şifre gerekli'}, 400
    if not user.check_password(current):
        return {'error': 'Mevcut şifre yanlış'}, 400
    user.set_password(new_pass)
    db.session.commit()
    return {'message': 'Şifre güncellendi'}


@settings_bp.route('/report-recipients', methods=['GET'])
@jwt_required()
def get_report_recipients():
    return {'recipients': []}


@settings_bp.route('/report-recipients', methods=['POST'])
@jwt_required()
def add_report_recipient():
    return {'message': 'Eklendi'}


@settings_bp.route('/report-recipients/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_report_recipient(rid):
    return {'message': 'Silindi'}


@settings_bp.route('/appearance', methods=['GET'])
@jwt_required()
def get_appearance():
    return {'language': 'tr', 'dateFormat': 'DD.MM.YYYY', 'timeFormat': '24h', 'isDarkMode': True}


@settings_bp.route('/appearance', methods=['PUT'])
@jwt_required()
def update_appearance():
    return {'message': 'Güncellendi'}


@settings_bp.route('/managed-stores', methods=['GET'])
@jwt_required()
def get_managed_stores():
    """Marka yöneticisi için yönettiği mağaza listesi (store switcher)."""
    user_id = get_jwt_identity()
    rows = ManagedStore.query.filter_by(manager_user_id=user_id).all()
    stores = []
    for r in rows:
        u = User.query.get(r.store_user_id)
        if u:
            stores.append({'id': u.id, 'username': u.username, 'full_name': u.full_name or u.username})
    return {'stores': stores}


# --- Kurulum: Site + Kameralar ---
@settings_bp.route('/cameras', methods=['GET'])
@jwt_required()
def get_cameras():
    user_id = get_settings_user_id()
    if not user_id:
        user_id = get_jwt_identity()
    site = SiteConfig.query.filter_by(user_id=user_id).first()
    cameras = CameraConfig.query.filter_by(user_id=user_id).order_by(CameraConfig.sort_order, CameraConfig.id).all()
    items = []
    for c in cameras:
        img = c.image_base64
        if img and not img.startswith('data:'):
            img = f'data:image/jpeg;base64,{img}' if img else None
        items.append({
            'id': c.id,
            'name': c.name,
            'type': c.camera_type or 'Kapı',
            'rtsp': c.rtsp_url or '',
            'imageUrl': img or '',
        })
    return {'site_name': site.site_name if site else None, 'cameras': items}


@settings_bp.route('/setup', methods=['POST'])
@jwt_required()
def post_setup():
    """Kurulum gönder: site_name + cameras. Mağaza kullanıcısı için kaydedilir (data_sender)."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    site_name = data.get('site_name') or data.get('siteName') or ''

    site = SiteConfig.query.filter_by(user_id=user_id).first()
    if site:
        site.site_name = site_name
    else:
        site = SiteConfig(user_id=user_id, site_name=site_name)
        db.session.add(site)
    db.session.commit()

    cameras_data = data.get('cameras') or []
    CameraConfig.query.filter_by(user_id=user_id).delete()

    for i, cam in enumerate(cameras_data):
        img = cam.get('image_base64') or cam.get('imageBase64') or ''
        if img and img.startswith('data:image'):
            img = img.split(',', 1)[-1] if ',' in img else img
        r = CameraConfig(
            user_id=user_id,
            name=cam.get('name') or f'Kamera {i+1}',
            camera_type=cam.get('type') or cam.get('camera_type') or 'Kişi Sayım',
            rtsp_url=cam.get('rtsp') or cam.get('rtsp_url') or '',
            image_base64=img or None,
            sort_order=i,
        )
        db.session.add(r)
    db.session.commit()
    return {'message': 'Kurulum kaydedildi', 'site_name': site_name}
