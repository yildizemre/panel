from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta

from models import db, CustomerData, QueueData
from user_context import get_resolved_user_ids

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/weekly-overview', methods=['GET'])
@jwt_required()
def weekly_overview():
    user_ids, _ = get_resolved_user_ids()
    if not user_ids:
        from flask_jwt_extended import get_jwt_identity
        user_ids = [get_jwt_identity()]
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)

    # Müşteri verileri
    customer_rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        CustomerData.timestamp >= start_date
    ).all()

    total_entered = sum(getattr(r, 'entered', 0) or 0 for r in customer_rows)
    total_exited = sum(getattr(r, 'exited', 0) or 0 for r in customer_rows)
    total_male = sum(r.male_count or 0 for r in customer_rows)
    total_female = sum(r.female_count or 0 for r in customer_rows)
    
    age_groups = {}
    for r in customer_rows:
        for attr in ['age_18_30', 'age_30_50', 'age_50_plus']:
            val = getattr(r, attr, 0) or 0
            age_groups[attr] = age_groups.get(attr, 0) + val
    
    busiest_age = 'N/A'
    if age_groups:
        busiest_age = max(age_groups, key=age_groups.get)
        busiest_age = {'age_18_30': '18-30', 'age_30_50': '30-50', 'age_50_plus': '50+'}.get(busiest_age, busiest_age)

    # Kuyruk verileri
    queue_rows = QueueData.query.filter(
        QueueData.user_id.in_(user_ids),
        QueueData.created_at >= start_date
    ).all()

    avg_wait = 0
    if queue_rows:
        waits = [r.wait_time for r in queue_rows if r.wait_time]
        avg_wait = sum(waits) / len(waits) if waits else 0

    # Günlük seriler
    daily_flow = {}
    daily_gender = {}
    daily_age = {}
    
    for i in range(7):
        d = (end_date - timedelta(days=6-i)).date()
        daily_flow[str(d)] = {'date': str(d), 'entered': 0, 'exited': 0}
        daily_gender[str(d)] = {'date': str(d), 'male': 0, 'female': 0}
        daily_age[str(d)] = {'date': str(d), 'age_18_30': 0, 'age_30_50': 0, 'age_50_plus': 0}

    for r in customer_rows:
        d = r.timestamp.date() if r.timestamp else None
        if d and str(d) in daily_flow:
            daily_flow[str(d)]['entered'] += getattr(r, 'entered', 0) or 0
            daily_flow[str(d)]['exited'] += getattr(r, 'exited', 0) or 0
            daily_gender[str(d)]['male'] += r.male_count or 0
            daily_gender[str(d)]['female'] += r.female_count or 0
            daily_age[str(d)]['age_18_30'] += getattr(r, 'age_18_30', 0) or 0
            daily_age[str(d)]['age_30_50'] += getattr(r, 'age_30_50', 0) or 0
            daily_age[str(d)]['age_50_plus'] += getattr(r, 'age_50_plus', 0) or 0

    return {
        'totals': {
            'customers': {
                'total_entered': total_entered,
                'total_exited': total_exited,
                'male': total_male,
                'female': total_female,
                'busiest_age_group': busiest_age,
            },
            'queues': {
                'avg_wait_time': avg_wait,
                'total_queues': len(queue_rows),
            }
        },
        'timeseries': {
            'daily_customer_flow': list(daily_flow.values()),
            'daily_gender': list(daily_gender.values()),
            'daily_age': list(daily_age.values()),
        }
    }
