from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
import requests
import json
import math

# Free routing API - using OpenRouteService (free tier available)
ROUTING_API_URL = "https://api.openrouteservice.org/v2/directions/driving-car"
# Note: For production, you'd need an API key. For demo, we'll use a mock or calculate approximate routes

@api_view(['POST'])
def calculate_trip(request):
    """
    Calculate trip route and generate ELD logs
    Input: current_location, pickup_location, dropoff_location, current_cycle_used
    """
    try:
        data = request.data
        current_location = data.get('current_location', '')
        pickup_location = data.get('pickup_location', '')
        dropoff_location = data.get('dropoff_location', '')
        current_cycle_used = float(data.get('current_cycle_used', 0))
        
        if not all([current_location, pickup_location, dropoff_location]):
            return Response(
                {'error': 'Missing required fields'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate route segments
        route_data = calculate_route_segments(
            current_location, 
            pickup_location, 
            dropoff_location
        )
        
        # Generate ELD logs
        eld_logs = generate_eld_logs(
            route_data, 
            current_cycle_used
        )
        
        return Response({
            'route': route_data,
            'eld_logs': eld_logs
        })
    
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def calculate_route_segments(current_loc, pickup_loc, dropoff_loc):
    """
    Calculate route segments with stops for fueling
    Returns route with coordinates, distance, duration, and stops
    """
    # For demo purposes, we'll use approximate calculations
    # In production, integrate with OpenRouteService or similar API
    
    # Generate coordinates for key locations
    current_coords = get_location_coordinates(current_loc)
    pickup_coords = get_location_coordinates(pickup_loc)
    dropoff_coords = get_location_coordinates(dropoff_loc)
    
    segments = []
    
    # Calculate actual distances
    current_to_pickup_distance = haversine_distance(current_coords, pickup_coords)
    pickup_to_dropoff_distance = haversine_distance(pickup_coords, dropoff_coords)
    
    # Average speed for truck (55 mph)
    avg_speed_mph = 55.0
    
    # Segment 1: Current to Pickup
    segment1_coords = generate_route_coordinates(current_coords, pickup_coords)
    segment1_duration = current_to_pickup_distance / avg_speed_mph
    segment1 = {
        'from': current_loc,
        'to': pickup_loc,
        'type': 'drive_to_pickup',
        'distance_miles': round(current_to_pickup_distance, 2),
        'duration_hours': round(segment1_duration, 2),
        'coordinates': segment1_coords
    }
    segments.append(segment1)
    
    # Pickup stop (1 hour)
    segments.append({
        'from': pickup_loc,
        'to': pickup_loc,
        'type': 'pickup',
        'distance_miles': 0,
        'duration_hours': 1.0,
        'coordinates': [pickup_coords]  # Single coordinate for pickup location
    })
    
    # Segment 2: Pickup to Dropoff
    segment2_coords = generate_route_coordinates(pickup_coords, dropoff_coords)
    segment2_duration = pickup_to_dropoff_distance / avg_speed_mph
    segment2 = {
        'from': pickup_loc,
        'to': dropoff_loc,
        'type': 'drive_to_dropoff',
        'distance_miles': round(pickup_to_dropoff_distance, 2),
        'duration_hours': round(segment2_duration, 2),
        'coordinates': segment2_coords
    }
    segments.append(segment2)
    
    # Add fueling stops every 1000 miles
    total_distance = segment1['distance_miles'] + segment2['distance_miles']
    fueling_stops = []
    
    # Calculate where fueling stops are needed (every 1000 miles)
    next_fueling_mile = 1000
    while next_fueling_mile <= total_distance:
        fueling_stops.append({
            'distance_at': next_fueling_mile,
            'location': f"Fuel Stop at {next_fueling_mile} miles"
        })
        next_fueling_mile += 1000
    
    # Insert fueling stops into segments
    # Calculate cumulative distances to position fueling stops correctly
    cumulative_distance = segment1['distance_miles']
    
    for stop in fueling_stops:
        # Determine if fueling stop is in segment 1 or segment 2
        if stop['distance_at'] <= cumulative_distance:
            # Fueling stop is in segment 1 (current to pickup)
            ratio = stop['distance_at'] / segment1['distance_miles'] if segment1['distance_miles'] > 0 else 0.5
            fuel_lat = current_coords[0] + (pickup_coords[0] - current_coords[0]) * ratio
            fuel_lng = current_coords[1] + (pickup_coords[1] - current_coords[1]) * ratio
        else:
            # Fueling stop is in segment 2 (pickup to dropoff)
            remaining_distance = stop['distance_at'] - cumulative_distance
            ratio = remaining_distance / segment2['distance_miles'] if segment2['distance_miles'] > 0 else 0.5
            fuel_lat = pickup_coords[0] + (dropoff_coords[0] - pickup_coords[0]) * ratio
            fuel_lng = pickup_coords[1] + (dropoff_coords[1] - pickup_coords[1]) * ratio
        
        segments.insert(-1, {
            'from': f"Fuel Stop at {stop['distance_at']} miles",
            'to': f"Fuel Stop at {stop['distance_at']} miles",
            'type': 'fueling',
            'distance_miles': 0,
            'duration_hours': 0.5,  # 30 minutes for fueling
            'coordinates': [[fuel_lat, fuel_lng]]
        })
    
    # Dropoff stop (1 hour)
    segments.append({
        'from': dropoff_loc,
        'to': dropoff_loc,
        'type': 'dropoff',
        'distance_miles': 0,
        'duration_hours': 1.0,
        'coordinates': [dropoff_coords]  # Single coordinate for dropoff location
    })
    
    # Calculate total route info (recalculate to ensure accuracy)
    total_distance = sum(s['distance_miles'] for s in segments)
    total_duration = sum(s['duration_hours'] for s in segments)
    
    return {
        'segments': segments,
        'total_distance_miles': total_distance,
        'total_duration_hours': total_duration,
        'route_coordinates': [coord for seg in segments for coord in seg.get('coordinates', [])],
        'key_locations': {
            'current': {
                'name': current_loc,
                'coordinates': current_coords
            },
            'pickup': {
                'name': pickup_loc,
                'coordinates': pickup_coords
            },
            'dropoff': {
                'name': dropoff_loc,
                'coordinates': dropoff_coords
            }
        }
    }


def get_location_coordinates(location_name):
    """
    Generate mock coordinates for a location
    In production, use real geocoding API
    """
    # Common city coordinates lookup
    city_coords = {
        'new york': [40.7128, -74.0060],
        'ny': [40.7128, -74.0060],
        'new york city': [40.7128, -74.0060],
        'philadelphia': [39.9526, -75.1652],
        'philly': [39.9526, -75.1652],
        'chicago': [41.8781, -87.6298],
        'los angeles': [34.0522, -118.2437],
        'la': [34.0522, -118.2437],
        'houston': [29.7604, -95.3698],
        'phoenix': [33.4484, -112.0740],
        'san antonio': [29.4241, -98.4936],
        'san diego': [32.7157, -117.1611],
        'dallas': [32.7767, -96.7970],
        'san jose': [37.3382, -121.8863],
        'austin': [30.2672, -97.7431],
        'jacksonville': [30.3322, -81.6557],
        'san francisco': [37.7749, -122.4194],
        'indianapolis': [39.7684, -86.1581],
        'columbus': [39.9612, -82.9988],
        'fort worth': [32.7555, -97.3308],
        'charlotte': [35.2271, -80.8431],
        'seattle': [47.6062, -122.3321],
        'denver': [39.7392, -104.9903],
        'washington': [38.9072, -77.0369],
        'boston': [42.3601, -71.0589],
        'el paso': [31.7619, -106.4850],
        'detroit': [42.3314, -83.0458],
        'nashville': [36.1627, -86.7816],
        'portland': [45.5152, -122.6784],
        'oklahoma city': [35.4676, -97.5164],
        'las vegas': [36.1699, -115.1398],
        'memphis': [35.1495, -90.0490],
        'louisville': [38.2527, -85.7585],
        'baltimore': [39.2904, -76.6122],
        'milwaukee': [43.0389, -87.9065],
        'albuquerque': [35.0844, -106.6504],
        'tucson': [32.2226, -110.9747],
        'fresno': [36.7378, -119.7871],
        'sacramento': [38.5816, -121.4944],
        'kansas city': [39.0997, -94.5786],
        'mesa': [33.4152, -111.8315],
        'atlanta': [33.7490, -84.3880],
        'omaha': [41.2565, -95.9345],
        'raleigh': [35.7796, -78.6382],
        'miami': [25.7617, -80.1918],
        'long beach': [33.7701, -118.1937],
        'virginia beach': [36.8529, -75.9780],
        'oakland': [37.8044, -122.2712],
        'minneapolis': [44.9778, -93.2650],
        'tulsa': [36.1540, -95.9928],
        'cleveland': [41.4993, -81.6944],
        'wichita': [37.6872, -97.3301],
        'arlington': [32.7357, -97.1081],
    }
    
    # Normalize location name
    normalized = location_name.lower().strip()
    
    # Check if it's a known city
    for city, coords in city_coords.items():
        if city in normalized or normalized in city:
            return coords
    
    # If not found, use hash-based generation but with better distribution
    hash_val = abs(hash(normalized)) % 10000
    
    # Generate coordinates within US bounds with better distribution
    base_lat = 30.0 + (hash_val % 25) * 0.5  # 30-42.5 latitude (US range)
    base_lng = -125.0 + (hash_val % 50) * 0.5  # -125 to -100 longitude (US range)
    
    return [base_lat, base_lng]


def haversine_distance(coord1, coord2):
    """
    Calculate the great circle distance between two points on Earth
    Returns distance in miles
    """
    # Radius of Earth in miles
    R = 3959.0
    
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


def generate_route_coordinates(start, end):
    """
    Generate route coordinates between two points
    In production, use routing API
    """
    # Calculate distance to determine number of points
    distance = haversine_distance(start, end)
    num_points = max(5, min(20, int(distance / 10)))  # 1 point per 10 miles, min 5, max 20
    
    coordinates = []
    
    for i in range(num_points + 1):
        ratio = i / num_points
        lat = start[0] + (end[0] - start[0]) * ratio
        lng = start[1] + (end[1] - start[1]) * ratio
        coordinates.append([lat, lng])
    
    return coordinates


def generate_eld_logs(route_data, current_cycle_used):
    """
    Generate ELD log sheets based on route and HOS rules
    Property-carrying driver: 70hrs/8days, no adverse conditions
    """
    logs = []
    segments = route_data['segments']
    
    # HOS Rules
    MAX_DRIVING_HOURS = 11  # Max driving before 10-hour break
    MAX_ON_DUTY_HOURS = 14  # Max on-duty before 10-hour break
    MIN_REST_HOURS = 10  # Minimum rest period
    MAX_CYCLE_HOURS = 70  # 70 hours in 8 days
    
    current_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    current_day = 0
    daily_log = create_daily_log_template(current_time, current_day)
    
    accumulated_driving = 0
    accumulated_on_duty = 0
    total_distance = 0
    
    for segment in segments:
        segment_type = segment['type']
        duration = segment['duration_hours']
        distance = segment['distance_miles']
        
        # Check if we need a new day
        if current_time.hour + duration >= 24:
            # Save current day log
            daily_log = finalize_daily_log(
                daily_log, 
                accumulated_driving, 
                accumulated_on_duty, 
                total_distance,
                current_cycle_used
            )
            logs.append(daily_log)
            
            # Start new day
            current_day += 1
            current_time = (current_time + timedelta(days=1)).replace(hour=0, minute=0)
            daily_log = create_daily_log_template(current_time, current_day)
            accumulated_driving = 0
            accumulated_on_duty = 0
            total_distance = 0
        
        # Add activity to log
        if segment_type in ['drive_to_pickup', 'drive_to_dropoff']:
            # Driving time
            start_time = current_time
            end_time = current_time + timedelta(hours=duration)
            
            # Check if we need rest before continuing
            if accumulated_driving + duration > MAX_DRIVING_HOURS:
                # Need rest break
                rest_start = current_time
                rest_end = rest_start + timedelta(hours=MIN_REST_HOURS)
                daily_log['activities'].append({
                    'type': 'off_duty',
                    'start': rest_start.strftime('%H:%M'),
                    'end': rest_end.strftime('%H:%M'),
                    'location': f"Rest break at {segment['from']}"
                })
                current_time = rest_end
                accumulated_driving = 0
                accumulated_on_duty = 0
            
            daily_log['activities'].append({
                'type': 'driving',
                'start': current_time.strftime('%H:%M'),
                'end': end_time.strftime('%H:%M'),
                'location': f"{segment['from']} to {segment['to']}",
                'distance': distance
            })
            accumulated_driving += duration
            accumulated_on_duty += duration
            total_distance += distance
            current_time = end_time
            
        elif segment_type in ['pickup', 'dropoff']:
            # On duty, not driving
            start_time = current_time
            end_time = current_time + timedelta(hours=duration)
            daily_log['activities'].append({
                'type': 'on_duty',
                'start': start_time.strftime('%H:%M'),
                'end': end_time.strftime('%H:%M'),
                'location': segment['from']
            })
            accumulated_on_duty += duration
            current_time = end_time
            
        elif segment_type == 'fueling':
            # On duty, not driving (fueling)
            start_time = current_time
            end_time = current_time + timedelta(hours=duration)
            daily_log['activities'].append({
                'type': 'on_duty',
                'start': start_time.strftime('%H:%M'),
                'end': end_time.strftime('%H:%M'),
                'location': segment['from']
            })
            accumulated_on_duty += duration
            current_time = end_time
    
    # Finalize last day log
    daily_log = finalize_daily_log(
        daily_log, 
        accumulated_driving, 
        accumulated_on_duty, 
        total_distance,
        current_cycle_used
    )
    logs.append(daily_log)
    
    return logs


def create_daily_log_template(date, day_number):
    """Create a template for a daily log sheet"""
    return {
        'date': date.strftime('%Y-%m-%d'),
        'day_number': day_number,
        'origin': '',
        'destination': '',
        'total_miles_driving': 0,
        'total_mileage': 0,
        'activities': [],
        'duty_status_timeline': [],
        'recap': {
            'on_duty_hours': 0,
            'driving_hours': 0,
            'off_duty_hours': 0,
            'sleeper_berth_hours': 0,
            'total_70hr_8day': 0,
            'available_tomorrow': 0
        }
    }


def finalize_daily_log(log, driving_hours, on_duty_hours, total_distance, current_cycle_used):
    """Finalize daily log with totals and recap"""
    log['total_miles_driving'] = total_distance
    log['total_mileage'] = total_distance
    
    # Calculate duty status totals from activities
    def parse_time_duration(start_str, end_str):
        """Parse time strings and calculate duration in hours"""
        try:
            start_parts = start_str.split(':')
            end_parts = end_str.split(':')
            start_hours = int(start_parts[0]) + int(start_parts[1]) / 60.0
            end_hours = int(end_parts[0]) + int(end_parts[1]) / 60.0
            # Handle day rollover
            if end_hours < start_hours:
                end_hours += 24
            return end_hours - start_hours
        except:
            return 0
    
    on_duty_total = sum(
        parse_time_duration(a['start'], a['end'])
        for a in log['activities'] if a['type'] == 'on_duty'
    )
    driving_time_total = sum(
        parse_time_duration(a['start'], a['end'])
        for a in log['activities'] if a['type'] == 'driving'
    )
    off_duty_total = sum(
        parse_time_duration(a['start'], a['end'])
        for a in log['activities'] if a['type'] == 'off_duty'
    )
    
    # If no off-duty calculated, calculate remaining time
    total_logged = on_duty_total + driving_time_total + off_duty_total
    if total_logged < 24:
        off_duty_total = 24 - total_logged
    
    log['recap'] = {
        'on_duty_hours': round(on_duty_total + driving_time_total, 2),
        'driving_hours': round(driving_time_total, 2),
        'off_duty_hours': round(off_duty_total, 2),
        'sleeper_berth_hours': 0,
        'total_70hr_8day': round(current_cycle_used + on_duty_total + driving_time_total, 2),
        'available_tomorrow': max(0, round(70 - (current_cycle_used + on_duty_total + driving_time_total), 2))
    }
    
    # Set origin and destination from first and last activities
    if log['activities']:
        log['origin'] = log['activities'][0].get('location', '')
        log['destination'] = log['activities'][-1].get('location', '')
    
    return log
