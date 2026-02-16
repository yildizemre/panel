from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app, origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.1.65:5173'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=True)
    db.init_app(app)
    jwt = JWTManager(app)

    # JWT 422 -> 401 + açıklayıcı mesaj
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({'error': 'Geçersiz veya eksik token. Lütfen tekrar giriş yapın.'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({'error': 'Token bulunamadı. Lütfen giriş yapın.'}), 401

    @app.errorhandler(422)
    def handle_422(err):
        return jsonify({'error': 'İstek formatı hatalı. Lütfen verileri kontrol edin.'}), 400

    from routes.auth import auth_bp
    from routes.admin import admin_bp
    from routes.dashboard import dashboard_bp
    from routes.analytics import analytics_bp
    from routes.settings import settings_bp
    from routes.health import health_bp
    from routes.weather import weather_bp
    from routes.staff import staff_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(health_bp, url_prefix='/api/health')
    app.register_blueprint(weather_bp, url_prefix='/api/weather')
    app.register_blueprint(staff_bp, url_prefix='/api/staff')

    @app.route('/api/init', methods=['POST'])
    def init_db():
        with app.app_context():
            db.create_all()
            from models import User
            if not User.query.filter_by(username='admin').first():
                admin = User(username='admin', email='admin@vislivis.com', role='admin')
                admin.set_password('admin')
                db.session.add(admin)
                db.session.commit()
                return {'message': 'Veritabanı oluşturuldu. Admin kullanıcı: admin / admin'}
            return {'message': 'Veritabanı zaten mevcut.'}

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
