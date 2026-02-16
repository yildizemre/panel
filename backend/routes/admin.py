import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from sqlalchemy import func

from models import db, User, CameraConfig, SiteConfig, ManagedStore
from auth_utils import admin_required

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(per_page, 100)
    
    pagination = User.query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page)
    user_ids = [u.id for u in pagination.items]

    # Kamera sayıları
    camera_counts = db.session.query(
        CameraConfig.user_id,
        func.count(CameraConfig.id).label('count')
    ).filter(CameraConfig.user_id.in_(user_ids)).group_by(CameraConfig.user_id).all()
    camera_map = {r.user_id: r.count for r in camera_counts}

    # Site adları (kullanıcı başına bir tane)
    sites = db.session.query(SiteConfig.user_id, SiteConfig.site_name).filter(
        SiteConfig.user_id.in_(user_ids)
    ).group_by(SiteConfig.user_id).all()
    site_map = {r.user_id: r.site_name for r in sites}

    managed_counts = db.session.query(
        ManagedStore.manager_user_id,
        func.count(ManagedStore.id).label('count')
    ).filter(ManagedStore.manager_user_id.in_(user_ids)).group_by(ManagedStore.manager_user_id).all()
    managed_map = {r.manager_user_id: r.count for r in managed_counts}

    managed_store_ids_map = {}
    for mid in user_ids:
        rows = ManagedStore.query.filter_by(manager_user_id=mid).all()
        managed_store_ids_map[mid] = [r.store_user_id for r in rows]

    users = []
    for u in pagination.items:
        d = u.to_public_dict()
        d['camera_count'] = camera_map.get(u.id, 0)
        d['site_name'] = site_map.get(u.id) or '-'
        d['managed_store_count'] = managed_map.get(u.id, 0)
        d['managed_store_ids'] = managed_store_ids_map.get(u.id, [])
        users.append(d)
    
    return jsonify({
        'users': users,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    try:
        data = request.get_json(silent=True) or {}
        if not data and request.get_data():
            data = json.loads(request.get_data(as_text=True))
    except (json.JSONDecodeError, TypeError):
        data = {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password')
    role = data.get('role', 'user') or 'user'
    full_name = (data.get('full_name') or '').strip() or None

    if not username:
        return jsonify({'error': 'Kullanıcı adı gerekli'}), 400
    if not email:
        return jsonify({'error': 'E-posta gerekli'}), 400
    if not password:
        return jsonify({'error': 'Şifre gerekli'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Bu kullanıcı adı zaten kullanılıyor'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Bu e-posta zaten kayıtlı'}), 400

    try:
        user = User(username=username, email=email, role=role, full_name=full_name)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        managed_ids = data.get('managed_store_ids') or []
        if role == 'brand_manager' and managed_ids:
            for sid in managed_ids:
                try:
                    sid = int(sid)
                    if sid != user.id and User.query.get(sid):
                        db.session.add(ManagedStore(manager_user_id=user.id, store_user_id=sid))
                except (TypeError, ValueError):
                    pass
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Veritabanı hatası: {str(e)}'}), 400

    return jsonify({'message': 'Kullanıcı oluşturuldu', 'user': user.to_public_dict()}), 201


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'email' in data:
        if data['email'] != user.email and User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Bu e-posta zaten kullanılıyor'}), 400
        user.email = data['email']
    if 'role' in data:
        user.role = data['role']
    if 'managed_store_ids' in data:
        ManagedStore.query.filter_by(manager_user_id=user_id).delete()
        for sid in data.get('managed_store_ids') or []:
            if sid and sid != user_id:
                db.session.add(ManagedStore(manager_user_id=user_id, store_user_id=int(sid)))
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'Güncellendi', 'user': user.to_public_dict()})


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.username == 'admin':
        return jsonify({'error': 'Admin hesabı silinemez'}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Kullanıcı silindi'})


@admin_bp.route('/users/<int:user_id>/managed-stores', methods=['GET'])
@admin_required
def get_user_managed_stores(user_id):
    rows = ManagedStore.query.filter_by(manager_user_id=user_id).all()
    stores = []
    for r in rows:
        u = User.query.get(r.store_user_id)
        if u:
            stores.append({'id': u.id, 'username': u.username, 'full_name': u.full_name or u.username})
    return jsonify({'stores': stores})


@admin_bp.route('/users/<int:user_id>/managed-stores', methods=['PUT'])
@admin_required
def set_user_managed_stores(user_id):
    data = request.get_json() or {}
    ids = data.get('store_user_ids') or data.get('managed_store_ids') or []
    ManagedStore.query.filter_by(manager_user_id=user_id).delete()
    for sid in ids:
        try:
            sid = int(sid)
            if sid != user_id and User.query.get(sid):
                db.session.add(ManagedStore(manager_user_id=user_id, store_user_id=sid))
        except (TypeError, ValueError):
            pass
    db.session.commit()
    return jsonify({'message': 'Güncellendi'})


@admin_bp.route('/users/<int:user_id>/impersonate', methods=['POST'])
@admin_required
def impersonate_user(user_id):
    """Admin: hedef kullanıcının token'ını al, tek tıkla o panele geç."""
    user = User.query.get_or_404(user_id)
    if not user.is_active:
        return jsonify({'error': 'Hesap devre dışı'}), 403

    access_token = create_access_token(
        identity=user.id,
        additional_claims={'role': user.role, 'username': user.username}
    )
    user_dict = user.to_public_dict()
    if user.role == 'brand_manager':
        rows = ManagedStore.query.filter_by(manager_user_id=user.id).all()
        user_dict['managed_stores'] = []
        for r in rows:
            u = User.query.get(r.store_user_id)
            if u:
                user_dict['managed_stores'].append({'id': u.id, 'username': u.username, 'full_name': u.full_name or u.username})
    return jsonify({
        'access_token': access_token,
        'user': user_dict
    })
