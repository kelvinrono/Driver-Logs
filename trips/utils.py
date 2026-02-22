"""
Utility functions for HOS (Hours of Service) calculations and trip planning
Based on FMCSA regulations for 70-hour/8-day cycle
"""
from datetime import datetime, timedelta
from math import ceil

# Constants for HOS regulations
MAX_CONTINUOUS_DRIVING = 11  # Hours
DRIVING_WINDOW = 14  # Hours
MANDATORY_REST_BREAK = 0.5  # 30 minutes
MIN_REST_BREAK = 10  # Hours off-duty before next driving window
MAX_HOURS_PER_CYCLE = 70  # 70-hour/8-day cycle
CYCLE_DAYS = 8  # Rolling 8-day cycle
FUEL_INTERVAL = 1000  # Miles between fuel stops
PICKUP_DROPOFF_TIME = 1  # Hour for each

# Average speeds
AVERAGE_HIGHWAY_SPEED = 60  # mph
AVERAGE_CITY_SPEED = 35  # mph


def geocode_address(address, maps_api_key):
    """
    Geocode an address using OpenRouteService (free alternative to Google Maps)
    Returns: {"lat": latitude, "lng": longitude}
    """
    try:
        import requests
        
        # Using OpenRouteService which has a free tier
        url = "https://api.openrouteservice.org/geocode/search"
        params = {
            "text": address,
            "api_key": maps_api_key
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('features'):
                coords = data['features'][0]['geometry']['coordinates']
                return {
                    "lat": coords[1],
                    "lng": coords[0]
                }
    except Exception as e:
        print(f"Geocoding error: {e}")
    
    return None


def calculate_route(from_coords, to_coords, via_pickup=None, maps_api_key=None):
    """
    Calculate route using OpenRouteService Matrix API
    Returns: {
        "distance": total_miles,
        "duration": total_hours,
        "polyline": encoded_polyline,
        "waypoints": list of coordinates,
        "stops": [{"type": "fuel/rest", "location": "...", "lat": ..., "lng": ...}]
    }
    """
    try:
        import requests
        
        # Build coordinates array
        coords = [
            [from_coords['lng'], from_coords['lat']],
        ]
        
        if via_pickup:
            coords.append([via_pickup['lng'], via_pickup['lat']])
        
        coords.append([to_coords['lng'], to_coords['lat']])
        
        # OpenRouteService directions API
        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        headers = {
            "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
            "Authorization": f"bearer {maps_api_key}",
            "Content-Type": "application/json;charset=utf-8"
        }
        
        payload = {
            "coordinates": coords,
            "geometry": True,
            "instructions": True
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            route = data['routes'][0]
            
            distance_meters = route['summary']['distance']
            duration_seconds = route['summary']['duration']
            
            # Convert to miles and hours
            distance_miles = distance_meters / 1609.34
            duration_hours = duration_seconds / 3600
            
            return {
                "distance": round(distance_miles, 2),
                "duration": round(duration_hours, 2),
                "polyline": route['geometry'],
                "stops": calculate_stops(distance_miles, coords, via_pickup is not None),
                "instructions": route.get('segments', [])
            }
    except Exception as e:
        print(f"Route calculation error: {e}")
        # Fallback to simple calculation
        import math
        lat1, lon1 = from_coords['lat'], from_coords['lng']
        lat2, lon2 = to_coords['lat'], to_coords['lng']
        
        # Haversine formula
        R = 3959  # Earth radius in miles
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance_miles = R * c
        
        return {
            "distance": round(distance_miles, 2),
            "duration": round(distance_miles / AVERAGE_HIGHWAY_SPEED, 2),
            "stops": calculate_stops(distance_miles, None, via_pickup is not None)
        }
    
    return None


def calculate_stops(distance_miles, coords=None, has_pickup=False):
    """Calculate required stops for fuel and rest"""
    stops = []
    
    # Calculate fuel stops
    num_fuel_stops = ceil(distance_miles / FUEL_INTERVAL) - 1
    
    if num_fuel_stops > 0 and coords:
        # Simple linear interpolation for stop locations
        for i in range(1, num_fuel_stops + 1):
            ratio = (i * FUEL_INTERVAL) / distance_miles
            if ratio < 1.0:
                # Interpolate between first and last coordinate
                if len(coords) >= 2:
                    lat = coords[0][1] + (coords[-1][1] - coords[0][1]) * ratio
                    lng = coords[0][0] + (coords[-1][0] - coords[0][0]) * ratio
                    stops.append({
                        "type": "fuel",
                        "distance_at": round(i * FUEL_INTERVAL, 2),
                        "duration_hours": 0.5,
                        "lat": lat,
                        "lng": lng
                    })
    elif num_fuel_stops > 0:
        for i in range(1, num_fuel_stops + 1):
            stops.append({
                "type": "fuel",
                "distance_at": round(i * FUEL_INTERVAL, 2),
                "duration_hours": 0.5
            })
    
    return stops


def generate_hos_schedule(total_distance, current_cycle_hours, has_pickup=True, start_date=None):
    """
    Generate an HOS-compliant schedule for the trip
    
    Returns: {
        "daily_schedules": [
            {
                "date": "2026-02-21",
                "off_duty_hours": 8.5,
                "driving_hours": 11,
                "on_duty_hours": 4.5,
                "sleeper_berth_hours": 0,
                "driving_segments": [
                    {"start_time": "06:00", "duration": 11, "distance": 660}
                ]
            }
        ],
        "total_days": 2,
        "available_driving_hours_today": 11,
        "remaining_cycle_hours": 45
    }
    """
    
    if start_date is None:
        start_date = datetime.now()
    else:
        start_date = datetime.fromisoformat(start_date)
    
    # Calculate time needed
    pickup_time = PICKUP_DROPOFF_TIME if has_pickup else 0
    dropoff_time = PICKUP_DROPOFF_TIME
    total_on_duty_time = pickup_time + dropoff_time
    
    # Estimate driving time at 60 mph
    driving_time = total_distance / AVERAGE_HIGHWAY_SPEED
    
    # Fuel stops
    num_fuel_stops = ceil(total_distance / FUEL_INTERVAL) - 1
    fuel_stop_time = num_fuel_stops * 0.5
    
    total_time_needed = driving_time + total_on_duty_time + fuel_stop_time
    
    # Available hours today
    remaining_cycle = MAX_HOURS_PER_CYCLE - current_cycle_hours
    available_today = min(DRIVING_WINDOW, remaining_cycle)
    
    # Calculate driving hours available
    available_driving_hours = min(MAX_CONTINUOUS_DRIVING, remaining_cycle)
    
    # Create schedule
    daily_schedules = []
    current_date = start_date
    remaining_distance = total_distance
    remaining_driving_time = driving_time
    remaining_on_duty = total_on_duty_time
    used_cycle_hours = current_cycle_hours
    
    while remaining_distance > 0 or remaining_on_duty > 0:
        day_schedule = {
            "date": current_date.strftime("%Y-%m-%d"),
            "off_duty_hours": 0,
            "sleeper_berth_hours": 0,
            "driving_hours": 0,
            "on_duty_hours": 0,
            "driving_segments": [],
            "rest_breaks": []
        }
        
        # Calculate what can be done today
        available_for_today = DRIVING_WINDOW
        driving_today = min(available_driving_hours, remaining_driving_time, available_for_today - 0.5)  # -0.5 for mandatory break
        
        # Driving happens with mandatory 30-min rest break after 8 hours
        segments = []
        driving_done = 0
        
        while driving_done < driving_today and remaining_distance > 0:
            segment_duration = min(MAX_CONTINUOUS_DRIVING, driving_today - driving_done)
            segment_distance = segment_duration * AVERAGE_HIGHWAY_SPEED
            
            segments.append({
                "distance": round(segment_distance, 2),
                "duration": round(segment_duration, 2)
            })
            
            driving_done += segment_duration
            remaining_distance -= segment_distance
            
            if driving_done < driving_today:
                day_schedule["rest_breaks"].append({
                    "duration": MANDATORY_REST_BREAK,
                    "reason": "Mandatory 30-min rest"
                })
                day_schedule["on_duty_hours"] += MANDATORY_REST_BREAK
        
        day_schedule["driving_hours"] = round(driving_done, 2)
        day_schedule["driving_segments"] = segments
        remaining_driving_time -= driving_done
        
        # On-duty time (pickup, dropoff, fuel stops)
        on_duty_today = min(remaining_on_duty, available_for_today - driving_done)
        day_schedule["on_duty_hours"] += round(on_duty_today, 2)
        remaining_on_duty -= on_duty_today
        
        # Rest time
        hours_used_today = day_schedule["driving_hours"] + day_schedule["on_duty_hours"]
        if hours_used_today < DRIVING_WINDOW:
            day_schedule["off_duty_hours"] = round(DRIVING_WINDOW - hours_used_today, 2)
        else:
            # Need full rest
            day_schedule["sleeper_berth_hours"] = round(MIN_REST_BREAK, 2)
        
        daily_schedules.append(day_schedule)
        
        used_cycle_hours += day_schedule["driving_hours"] + day_schedule["on_duty_hours"]
        available_driving_hours = MAX_CONTINUOUS_DRIVING  # Reset for next day
        current_date += timedelta(days=1)
        
        if len(daily_schedules) > 10:  # Safety limit
            break
    
    return {
        "daily_schedules": daily_schedules,
        "total_days": len(daily_schedules),
        "total_distance": round(total_distance, 2),
        "available_driving_hours_today": min(MAX_CONTINUOUS_DRIVING, remaining_cycle - current_cycle_hours),
        "remaining_cycle_hours": max(0, remaining_cycle - (used_cycle_hours - current_cycle_hours))
    }
