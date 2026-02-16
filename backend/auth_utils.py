"""Manuel JWT doğrulama - flask-jwt-extended bypass"""
import jwt
from functools import wraps
from flask import request, jsonify

def get_token_from_request():
    token = request.args.get('token')
    if token:
        return token
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:]
    return None

def admin_required(fn):
    @wraps(fn)
    def decorator(*args, **kwargs):
        from flask import current_app
        token = get_token_from_request()
        if not token:
            return jsonify({'error': 'Token gerekli'}), 401
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            if payload.get('role') != 'admin':
                return jsonify({'error': 'Yetkisiz erişim'}), 403
            return fn(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token süresi doldu'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Geçersiz token'}), 401
    return decorator
