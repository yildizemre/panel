from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from models import db, User, ManagedStore

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username_or_email = data.get('username') or data.get('email')
    password = data.get('password')

    if not username_or_email or not password:
        return jsonify({'error': 'Kullanıcı adı/email ve şifre gerekli'}), 400

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Geçersiz kullanıcı adı veya şifre'}), 401

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


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
    data = user.to_public_dict()
    if user.role == 'brand_manager':
        rows = ManagedStore.query.filter_by(manager_user_id=user.id).all()
        data['managed_stores'] = [{'id': r.store_user_id} for r in rows]
        for i, r in enumerate(rows):
            u = User.query.get(r.store_user_id)
            if u:
                data['managed_stores'][i]['username'] = u.username
                data['managed_stores'][i]['full_name'] = u.full_name or u.username
    return jsonify(data)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')

    if not username or not email or not password:
        return jsonify({'error': 'username, email ve password gerekli'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Bu kullanıcı adı zaten kullanılıyor'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Bu e-posta zaten kayıtlı'}), 400

    user = User(username=username, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Kayıt başarılı', 'user': user.to_public_dict()}), 201
