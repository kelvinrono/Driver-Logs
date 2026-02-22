from rest_framework import serializers
from .models import Trip, DailyLog, LogEntry, Route

class LogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEntry
        fields = ['id', 'hour', 'minute', 'duty_status', 'location', 'notes']


class DailyLogSerializer(serializers.ModelSerializer):
    entries = LogEntrySerializer(many=True, read_only=True)
    
    class Meta:
        model = DailyLog
        fields = [
            'id', 'log_date', 'off_duty_hours', 'sleeper_berth_hours',
            'driving_hours', 'on_duty_hours', 'total_distance', 'total_vehicle_miles',
            'remarks', 'entries'
        ]


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = ['id', 'polyline', 'waypoints', 'stops', 'created_at']


class TripSerializer(serializers.ModelSerializer):
    daily_logs = DailyLogSerializer(many=True, read_only=True)
    route = RouteSerializer(read_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'current_location', 'pickup_location', 'dropoff_location',
            'current_cycle_used', 'total_distance', 'estimated_duration',
            'daily_logs', 'route', 'created_at', 'updated_at'
        ]
