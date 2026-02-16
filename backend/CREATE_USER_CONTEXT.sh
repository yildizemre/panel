#!/bin/bash
# Sunucuda backend/ dizininde çalıştırın: bash CREATE_USER_CONTEXT.sh

cat > user_context.py << 'ENDOFFILE'
"""Kullanıcı yetki bağlamı: brand_manager için yönetilen mağazalar, store_id filtresi."""
from flask import request
from flask_jwt_extended import get_jwt_identity, get_jwt

from models import ManagedStore, User


def get_effective_user_ids(user_id: int, role: str) -> list:
    """
    Veri sorgulama için kullanılacak user_id listesi.
    - admin: tüm kullanıcılar (özel işlemler için - analytics'te genelde kullanılmaz)
    - brand_manager: yönettiği mağaza id'leri
    - user: sadece kendisi
    """
    if role == 'admin':
        return []
    if role == 'brand_manager':
        rows = ManagedStore.query.filter_by(manager_user_id=user_id).all()
        return [r.store_user_id for r in rows]
    return [user_id]


def get_resolved_user_ids():
    """
    Request'ten store_id ve JWT'den user bilgisini alır.
    Returns: (query için user_id listesi, seçili store_id veya None)
    """
    user_id = get_jwt_identity()
    if not user_id:
        return ([], None)
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return ([], None)

    claims = get_jwt() or {}
    role = claims.get('role', 'user')
    store_id_param = request.args.get('store_id', type=int)

    if role == 'brand_manager':
        managed_ids = get_effective_user_ids(user_id, role)
        if not managed_ids:
            return ([user_id], user_id)
        if store_id_param and store_id_param in managed_ids:
            return ([store_id_param], store_id_param)
        return (managed_ids, None)

    if role == 'admin' and store_id_param:
        return ([store_id_param], store_id_param)
    return ([user_id], user_id)


def get_settings_user_id():
    """Settings/kameralar için hangi user'ın verisi - ?store_id= ile override."""
    user_id = get_jwt_identity()
    if not user_id:
        return None
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    claims = get_jwt() or {}
    role = claims.get('role', 'user')
    store_id_param = request.args.get('store_id', type=int)
    if role == 'brand_manager' and store_id_param:
        managed = get_effective_user_ids(user_id, role)
        if store_id_param in managed:
            return store_id_param
    if role == 'brand_manager':
        managed = get_effective_user_ids(user_id, role)
        return managed[0] if managed else user_id
    return user_id
ENDOFFILE
echo "user_context.py oluşturuldu."
