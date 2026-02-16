import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'vislivis-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///vislivis.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'vislivis-jwt-secret'
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 saat
    JWT_TOKEN_LOCATION = ['headers', 'query_string']
    JWT_QUERY_STRING_NAME = 'token'
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_CSRF_PROTECT = False  # API Bearer token için CSRF kapalı
