from flask import Blueprint

staff_bp = Blueprint('staff', __name__)


@staff_bp.route('/capture-image', methods=['POST'])
def capture_image():
    return {'image_url': '', 'message': 'Özellik henüz aktif değil'}
