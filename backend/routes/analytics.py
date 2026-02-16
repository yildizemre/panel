from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from collections import defaultdict

from models import db, CustomerData, QueueData, HeatmapData, StaffData, Report
from user_context import get_resolved_user_ids

analytics_bp = Blueprint('analytics', __name__)


def _user_ids():
    """Veri sorgulama için kullanılacak user_id listesi (brand_manager: yönettiği mağazalar)."""
    ids, _ = get_resolved_user_ids()
    return ids if ids else [get_jwt_identity()]


# --- Customer Analytics ---
@analytics_bp.route('/customers', methods=['GET'])
@jwt_required()
def get_customers():
    user_ids = _user_ids()
    date_str = request.args.get('date')
    camera_id = request.args.get('camera_id')

    q = CustomerData.query.filter(CustomerData.user_id.in_(user_ids))
    if date_str:
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            q = q.filter(db.func.date(CustomerData.timestamp) == d)
        except ValueError:
            pass
    if camera_id and camera_id != 'all':
        q = q.filter(CustomerData.camera_id == camera_id)

    rows = q.order_by(CustomerData.timestamp.desc()).limit(500).all()

    # Demographics
    total_male = sum(getattr(r, 'male_count', 0) or 0 for r in rows)
    total_female = sum(getattr(r, 'female_count', 0) or 0 for r in rows)
    age_18_30 = sum(getattr(r, 'age_18_30', 0) or 0 for r in rows)
    age_30_50 = sum(getattr(r, 'age_30_50', 0) or 0 for r in rows)
    age_50_plus = sum(getattr(r, 'age_50_plus', 0) or 0 for r in rows)

    demographics = {
        'ageGroupsChart': [
            {'name': '18-30', 'value': age_18_30},
            {'name': '30-50', 'value': age_30_50},
            {'name': '50+', 'value': age_50_plus},
        ],
        'genderDistributionChart': [
            {'gender': 'Erkek', 'value': total_male},
            {'gender': 'Kadın', 'value': total_female},
        ],
    }

    # Saatlik akış (saat bazında toplam)
    by_hour = defaultdict(lambda: {'entering': 0, 'exiting': 0})
    for r in rows:
        h = r.timestamp.strftime('%H:00') if r.timestamp else '00:00'
        by_hour[h]['entering'] += getattr(r, 'entered', 0) or 0
        by_hour[h]['exiting'] += getattr(r, 'exited', 0) or 0

    hourly_customer_flow = [
        {'hour': h, 'entering': v['entering'], 'exiting': v['exiting']}
        for h in sorted(by_hour.keys())
        for v in [by_hour[h]]
    ]

    all_cameras = []
    if not camera_id or camera_id == 'all':
        cam_q = CustomerData.query.filter(CustomerData.user_id.in_(user_ids))
        all_cameras = list({r.camera_id for r in cam_q if r.camera_id})

    data = [
        {
            'id': r.id,
            'timestamp': r.timestamp.isoformat() if r.timestamp else None,
            'location': r.location,
            'customers_inside': r.customers_inside,
            'male_count': r.male_count,
            'female_count': r.female_count,
            'age_18_30': r.age_18_30,
            'age_30_50': r.age_30_50,
            'age_50_plus': r.age_50_plus,
            'zone_visited': r.zone_visited,
            'purchase_amount': r.purchase_amount,
            'entered': getattr(r, 'entered', 0),
            'exited': getattr(r, 'exited', 0),
        }
        for r in rows
    ]

    return {
        'data': data,
        'demographics': demographics,
        'hourlyCustomerFlow': hourly_customer_flow,
        'all_cameras': all_cameras,
    }


def _parse_timestamp(ts_str):
    """ISO veya 'YYYY-MM-DD HH:MM' formatında timestamp parse et."""
    if not ts_str:
        return None
    s = str(ts_str).replace('T', ' ')[:19]
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d'):
        try:
            return datetime.strptime(s[:len(fmt)], fmt)
        except (ValueError, TypeError):
            pass
    return None


@analytics_bp.route('/customers', methods=['POST'])
@jwt_required()
def post_customer():
    user_id = get_jwt_identity()
    data = request.get_json()
    ts = _parse_timestamp(data.get('timestamp'))
    r = CustomerData(
        user_id=user_id,
        timestamp=ts if ts else datetime.utcnow(),
        location=data.get('location'),
        customers_inside=data.get('customers_inside', 0),
        male_count=data.get('male_count', 0),
        female_count=data.get('female_count', 0),
        age_18_30=data.get('age_18_30', 0),
        age_30_50=data.get('age_30_50', 0),
        age_50_plus=data.get('age_50_plus', 0),
        zone_visited=data.get('zone_visited'),
        purchase_amount=data.get('purchase_amount', 0),
        is_returning=data.get('is_returning', False),
        satisfaction_score=data.get('satisfaction_score'),
        entered=data.get('entered', 0),
        exited=data.get('exited', 0),
    )
    db.session.add(r)
    db.session.commit()
    return {'id': r.id, 'message': 'Kaydedildi'}, 201


@analytics_bp.route('/customers/flow-data', methods=['GET'])
@jwt_required()
def get_flow_data():
    user_ids = _user_ids()
    date_from = request.args.get('date_from')
    camera_id = request.args.get('camera_id')

    q = CustomerData.query.filter(CustomerData.user_id.in_(user_ids))
    if date_from:
        try:
            d = datetime.strptime(date_from, '%Y-%m-%d').date()
            q = q.filter(db.func.date(CustomerData.timestamp) == d)
        except ValueError:
            pass
    if camera_id and camera_id != 'all':
        q = q.filter(CustomerData.camera_id == camera_id)

    rows = q.order_by(CustomerData.timestamp).limit(500).all()

    # Tarih bazında grupla: data[dateStr] = { summary, hourly_data }
    result_data = {}
    by_date_hour = defaultdict(lambda: {'entered': 0, 'exited': 0, 'editable_id': None})

    for r in rows:
        if not r.timestamp:
            continue
        date_str = r.timestamp.strftime('%Y-%m-%d')
        hour_str = r.timestamp.strftime('%H:00')
        key = (date_str, hour_str)
        by_date_hour[key]['entered'] += getattr(r, 'entered', 0) or 0
        by_date_hour[key]['exited'] += getattr(r, 'exited', 0) or 0
        if by_date_hour[key]['editable_id'] is None:
            by_date_hour[key]['editable_id'] = r.id

    for (date_str, hour_str), v in by_date_hour.items():
        if date_str not in result_data:
            result_data[date_str] = {'summary': {'total_entered': 0, 'total_exited': 0}, 'hourly_data': {}}
        result_data[date_str]['hourly_data'][hour_str] = {
            'entered': v['entered'],
            'exited': v['exited'],
            'editable_id': v['editable_id'],
        }
        result_data[date_str]['summary']['total_entered'] += v['entered']
        result_data[date_str]['summary']['total_exited'] += v['exited']

    return {'data': result_data}


@analytics_bp.route('/customers/record/<int:rid>', methods=['PUT', 'DELETE'])
@jwt_required()
def customer_record(rid):
    uids = _user_ids()
    r = CustomerData.query.filter(CustomerData.id == rid, CustomerData.user_id.in_(uids)).first_or_404()
    if request.method == 'DELETE':
        db.session.delete(r)
        db.session.commit()
        return {'message': 'Silindi'}
    data = request.get_json() or {}
    if 'entering' in data:
        r.entered = int(data['entering']) if data['entering'] is not None else 0
    if 'exiting' in data:
        r.exited = int(data['exiting']) if data['exiting'] is not None else 0
    db.session.commit()
    return {'message': 'Güncellendi'}


# --- Queue Analytics ---
@analytics_bp.route('/queues', methods=['GET'])
@jwt_required()
def get_queues():
    user_ids = _user_ids()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    
    q = QueueData.query.filter(QueueData.user_id.in_(user_ids))
    if status:
        q = q.filter(QueueData.status == status)
    pagination = q.order_by(QueueData.created_at.desc()).paginate(page=page, per_page=per_page)
    items = []
    for r in pagination.items:
        items.append({
            'id': r.id,
            'customer_id': r.customer_id,
            'enter_time': r.enter_time.isoformat() if r.enter_time else None,
            'exit_time': r.exit_time.isoformat() if r.exit_time else None,
            'wait_time': r.wait_time,
            'queue_position': r.queue_position,
            'cashier_id': r.cashier_id,
            'status': r.status,
        })
    return {'data': items, 'total': pagination.total, 'page': page}


@analytics_bp.route('/queues', methods=['POST'])
@jwt_required()
def post_queue():
    data = request.get_json()
    ts = _parse_timestamp(data.get('timestamp'))
    r = QueueData(
        user_id=get_jwt_identity(),
        customer_id=data.get('customer_id'),
        enter_time=datetime.fromisoformat(data['enter_time']) if data.get('enter_time') else None,
        exit_time=datetime.fromisoformat(data['exit_time']) if data.get('exit_time') else None,
        wait_time=float(data.get('wait_time', 0) or 0),
        queue_position=data.get('queue_position'),
        cashier_id=data.get('cashier_id'),
        status=data.get('status'),
        total_customers=int(data.get('total_customers', 1) or 1),
        recorded_at=ts if ts else datetime.utcnow(),
    )
    db.session.add(r)
    db.session.commit()
    return {'id': r.id, 'message': 'Kaydedildi'}, 201


@analytics_bp.route('/queues/daily-summary', methods=['GET'])
@jwt_required()
def queues_daily_summary():
    user_ids = _user_ids()
    date_val = request.args.get('date_from') or request.args.get('date')
    date_to = request.args.get('date_to')
    cashier_ids = request.args.get('cashier_ids')

    q = QueueData.query.filter(QueueData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                q = q.filter(db.func.date(QueueData.recorded_at) >= d, db.func.date(QueueData.recorded_at) <= d_to)
            else:
                q = q.filter(db.func.date(db.func.coalesce(QueueData.recorded_at, QueueData.created_at)) == d)
        except ValueError:
            pass
    # Tüm kasalar her zaman listede olsun (kasa filtresine bakılmadan, sadece tarihe göre)
    q_all_cashiers = QueueData.query.filter(QueueData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                q_all_cashiers = q_all_cashiers.filter(db.func.date(db.func.coalesce(QueueData.recorded_at, QueueData.created_at)) >= d, db.func.date(db.func.coalesce(QueueData.recorded_at, QueueData.created_at)) <= d_to)
            else:
                q_all_cashiers = q_all_cashiers.filter(db.func.date(db.func.coalesce(QueueData.recorded_at, QueueData.created_at)) == d)
        except ValueError:
            pass
    all_cashiers = sorted(set(r[0] for r in q_all_cashiers.with_entities(QueueData.cashier_id).distinct().all() if r[0]))

    if cashier_ids and cashier_ids != 'all':
        q = q.filter(QueueData.cashier_id == cashier_ids)

    rows = q.all()

    from collections import defaultdict
    by_hour = defaultdict(lambda: {'totalCustomers': 0, 'wait_sum': 0, 'minWaitTime': float('inf'), 'maxWaitTime': 0, 'editable_id': None})
    for r in rows:
        dt = getattr(r, 'recorded_at', None) or r.created_at
        h = dt.strftime('%H') if dt else '00'
        cnt = getattr(r, 'total_customers', None) or 1
        wt = r.wait_time or 0
        by_hour[h]['totalCustomers'] += cnt
        by_hour[h]['wait_sum'] += wt * cnt
        by_hour[h]['minWaitTime'] = min(by_hour[h]['minWaitTime'], wt) if wt else by_hour[h]['minWaitTime']
        by_hour[h]['maxWaitTime'] = max(by_hour[h]['maxWaitTime'], wt)
        if by_hour[h]['editable_id'] is None:
            by_hour[h]['editable_id'] = r.id

    hourly = []
    for h in range(10, 23):
        key = str(h)
        v = by_hour[key]
        avg_wt = v['wait_sum'] / v['totalCustomers'] if v['totalCustomers'] > 0 else 0
        hourly.append({
            'hour': f'{h}:00',
            'totalCustomers': v['totalCustomers'],
            'avgWaitTime': round(avg_wt, 1),
            'minWaitTime': v['minWaitTime'] if v['minWaitTime'] != float('inf') else 0,
            'maxWaitTime': v['maxWaitTime'],
            'editable_id': v['editable_id'],
        })

    total_cust = sum(getattr(r, 'total_customers', 1) or 1 for r in rows)
    waits = [r.wait_time for r in rows if r.wait_time]
    avg_wait = sum(waits) / len(waits) if waits else 0

    by_cashier = defaultdict(lambda: {'totalCustomers': 0, 'wait_sum': 0})
    for r in rows:
        cid = r.cashier_id or 'Bilinmeyen'
        cnt = getattr(r, 'total_customers', 1) or 1
        by_cashier[cid]['totalCustomers'] += cnt
        by_cashier[cid]['wait_sum'] += (r.wait_time or 0) * cnt
    cashier_perf = [
        {'cashier': c, 'totalCustomers': v['totalCustomers'], 'avgWait': v['wait_sum'] / v['totalCustomers'] if v['totalCustomers'] > 0 else 0}
        for c, v in sorted(by_cashier.items())
    ]

    return {
        'overallStats': {'totalCustomers': total_cust, 'avgWaitTime': avg_wait, 'maxWaitTime': max((r.wait_time or 0) for r in rows) if rows else 0},
        'hourlySummary': hourly,
        'waitTimeDistribution': [],
        'cashierPerformance': cashier_perf,
        'allCashiers': all_cashiers,
        'availableCashiers': all_cashiers,
    }


@analytics_bp.route('/queues/record/<int:rid>', methods=['PUT', 'DELETE'])
@jwt_required()
def queue_record(rid):
    uids = _user_ids()
    r = QueueData.query.filter(QueueData.id == rid, QueueData.user_id.in_(uids)).first_or_404()
    if request.method == 'DELETE':
        db.session.delete(r)
        db.session.commit()
        return {'message': 'Silindi'}
    data = request.get_json() or {}
    if 'avgWaitTime' in data:
        r.wait_time = data['avgWaitTime']
    if 'totalCustomers' in data:
        pass  # QueueData is per-record, could duplicate for count
    db.session.commit()
    return {'message': 'Güncellendi'}


# --- Heatmap ---
@analytics_bp.route('/heatmaps', methods=['GET'])
@jwt_required()
def get_heatmaps():
    user_ids = _user_ids()
    q = HeatmapData.query.filter(HeatmapData.user_id.in_(user_ids))
    rows = q.order_by(HeatmapData.created_at.desc()).limit(100).all()
    return {'data': [{'id': r.id, 'zone': r.zone, 'intensity': r.intensity, 'visitor_count': r.visitor_count, 'heatmap_type': r.heatmap_type} for r in rows]}


@analytics_bp.route('/heatmaps', methods=['POST'])
@jwt_required()
def post_heatmap():
    data = request.get_json()
    ts = _parse_timestamp(data.get('timestamp'))
    dt = ts if ts else datetime.utcnow()
    if data.get('date_recorded'):
        try:
            date_rec = datetime.strptime(str(data['date_recorded'])[:10], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            date_rec = dt.date()
    else:
        date_rec = dt.date()
    r = HeatmapData(
        user_id=get_jwt_identity(),
        zone=data.get('zone'),
        intensity=float(data.get('intensity', 0) or 0),
        visitor_count=int(data.get('visitor_count', 0) or 0),
        camera_id=data.get('camera_id') or None,
        date_recorded=date_rec,
        recorded_at=ts if ts else datetime.utcnow(),
    )
    db.session.add(r)
    db.session.commit()
    return {'id': r.id, 'message': 'Kaydedildi'}, 201


@analytics_bp.route('/heatmaps/daily-summary', methods=['GET'])
@jwt_required()
def heatmaps_daily_summary():
    user_ids = _user_ids()
    date_val = request.args.get('date') or request.args.get('date_from')
    date_to = request.args.get('date_to')
    zone_ids = request.args.get('zone_ids')
    
    q = HeatmapData.query.filter(HeatmapData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                q = q.filter(HeatmapData.date_recorded >= d, HeatmapData.date_recorded <= d_to)
            else:
                q = q.filter(HeatmapData.date_recorded == d)
        except ValueError:
            pass
    rows_filtered = q.all()
    if zone_ids and zone_ids != 'all':
        q = q.filter(HeatmapData.zone == zone_ids)
        rows = q.all()
    else:
        rows = rows_filtered

    # Tüm bölgeler her zaman listede olsun (zone filtresine bakılmadan, sadece tarihe göre)
    q_all_zones = HeatmapData.query.filter(HeatmapData.user_id.in_(user_ids))
    if date_val:
        try:
            d = datetime.strptime(date_val, '%Y-%m-%d').date()
            if date_to:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                q_all_zones = q_all_zones.filter(HeatmapData.date_recorded >= d, HeatmapData.date_recorded <= d_to)
            else:
                q_all_zones = q_all_zones.filter(HeatmapData.date_recorded == d)
        except ValueError:
            pass
    zones = sorted(set(r[0] for r in q_all_zones.with_entities(HeatmapData.zone).distinct().all() if r[0]))
    
    # Saat bazında grupla (recorded_at veya created_at)
    by_hour = defaultdict(lambda: {'totalVisitors': 0, 'intensity_sum': 0, 'count': 0, 'editable_id': None})
    for r in rows:
        dt = getattr(r, 'recorded_at', None) or r.created_at
        h = dt.strftime('%H') if dt else '12'
        by_hour[h]['totalVisitors'] += r.visitor_count or 0
        inv = r.intensity or 0
        by_hour[h]['intensity_sum'] += inv
        by_hour[h]['count'] += 1
        if by_hour[h]['editable_id'] is None:
            by_hour[h]['editable_id'] = r.id
    
    hourly = []
    for h in range(10, 23):
        key = str(h)
        v = by_hour[key]
        avg_dwell = v['intensity_sum'] / v['count'] if v['count'] > 0 else 0
        hourly.append({
            'hour': f'{h}:00',
            'totalVisitors': v['totalVisitors'],
            'avgDwellTime': round(avg_dwell, 1),
            'editable_id': v['editable_id'],
        })
    
    total_visitors = sum(r.visitor_count or 0 for r in rows)
    avg_dwell = sum(r.intensity or 0 for r in rows) / len(rows) if rows else 0
    busiest = max(rows, key=lambda r: r.visitor_count or 0).zone if rows else 'N/A'
    
    zone_agg = defaultdict(lambda: {'totalVisitors': 0, 'intensity_sum': 0, 'count': 0})
    for r in rows:
        z = r.zone or 'Bilinmeyen'
        zone_agg[z]['totalVisitors'] += r.visitor_count or 0
        zone_agg[z]['intensity_sum'] += r.intensity or 0
        zone_agg[z]['count'] += 1
    zone_perf = [
        {'zone': z, 'totalVisitors': v['totalVisitors'], 'avgDwell': v['intensity_sum'] / v['count'] if v['count'] > 0 else 0}
        for z, v in sorted(zone_agg.items())
    ]
    
    return {
        'overallStats': {'totalVisitors': total_visitors, 'avgDwellTime': avg_dwell, 'busiestZone': busiest},
        'hourlySummary': hourly,
        'dwellTimeDistribution': [],
        'zonePerformance': zone_perf,
        'allZones': zones,
        'comparisonStats': {'totalVisitors': []},
    }


@analytics_bp.route('/heatmaps/record/<int:rid>', methods=['PUT', 'DELETE'])
@jwt_required()
def heatmap_record(rid):
    uids = _user_ids()
    r = HeatmapData.query.filter(HeatmapData.id == rid, HeatmapData.user_id.in_(uids)).first_or_404()
    if request.method == 'DELETE':
        db.session.delete(r)
        db.session.commit()
        return {'message': 'Silindi'}
    data = request.get_json() or {}
    if 'totalVisitors' in data:
        r.visitor_count = data['totalVisitors']
    if 'avgDwellTime' in data:
        r.intensity = data['avgDwellTime']
    db.session.commit()
    return {'message': 'Güncellendi'}


# --- Staff ---
@analytics_bp.route('/staff', methods=['GET'])
@jwt_required()
def get_staff():
    user_ids = _user_ids()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    
    q = StaffData.query.filter(StaffData.user_id.in_(user_ids))
    if status:
        q = q.filter(StaffData.status == status)
    pagination = q.order_by(StaffData.created_at.desc()).paginate(page=page, per_page=per_page)
    items = [{'id': r.id, 'staff_id': r.staff_id, 'name': r.name, 'role': r.role, 'location': r.location, 'activity_level': r.activity_level, 'status': r.status} for r in pagination.items]
    return {'data': items, 'total': pagination.total, 'page': page}


@analytics_bp.route('/staff', methods=['POST'])
@jwt_required()
def post_staff():
    data = request.get_json()
    r = StaffData(
        user_id=get_jwt_identity(),
        staff_id=data.get('staff_id'),
        name=data.get('name'),
        role=data.get('role'),
        location=data.get('location'),
        activity_level=data.get('activity_level'),
        status=data.get('status'),
    )
    db.session.add(r)
    db.session.commit()
    return {'id': r.id, 'message': 'Kaydedildi'}, 201


# --- Reports ---
@analytics_bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    user_ids = _user_ids()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    pagination = Report.query.filter(Report.user_id.in_(user_ids)).order_by(Report.created_at.desc()).paginate(page=page, per_page=per_page)
    items = [{'id': str(r.id), 'analysis_type': r.report_type, 'name': r.report_name, 'status': 'completed', 'createdAt': r.created_at.isoformat() if r.created_at else None} for r in pagination.items]
    return {'reports': items, 'data': items, 'total': pagination.total, 'page': page}


@analytics_bp.route('/create-report', methods=['POST'])
@jwt_required()
def create_report():
    data = request.get_json()
    rtype = data.get('report_type') or data.get('analysisType', 'customer')
    dfrom = data.get('date_from') or data.get('dateFrom')
    dto = data.get('date_to') or data.get('dateTo')
    r = Report(
        user_id=get_jwt_identity(),
        report_type=rtype,
        report_name=data.get('report_name', f'{rtype} Raporu'),
        date_from=datetime.strptime(dfrom, '%Y-%m-%d').date() if dfrom else None,
        date_to=datetime.strptime(dto, '%Y-%m-%d').date() if dto else None,
    )
    db.session.add(r)
    db.session.commit()
    return {
        'report': {'id': str(r.id), 'analysis_type': rtype, 'status': 'completed', 'createdAt': r.created_at.isoformat() if r.created_at else None},
        'report_id': r.id
    }
