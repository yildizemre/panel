from flask import Blueprint

weather_bp = Blueprint('weather', __name__)


@weather_bp.route('/forecast', methods=['GET'])
def forecast():
    return {
        'temperature': 22,
        'condition': 'sunny',
        'humidity': 45,
        'forecast': []
    }
