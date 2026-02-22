from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import datetime, timedelta
import os

from .models import Trip, DailyLog, LogEntry, Route
from .serializers import TripSerializer, DailyLogSerializer, RouteSerializer
from .utils import generate_hos_schedule, geocode_address, calculate_route


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def calculate_route(self, request):
        """
        Calculate route and generate HOS schedule
        
        Request body:
        {
            "current_location": "123 Main St, City, State",
            "pickup_location": "Pickup Address",
            "dropoff_location": "Dropoff Address",
            "current_cycle_used": 35.5
        }
        """
        try:
            maps_api_key = os.getenv('OPENROUTE_API_KEY')
            
            if not maps_api_key:
                return Response(
                    {"error": "Maps API key not configured"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            current_location = request.data.get('current_location')
            pickup_location = request.data.get('pickup_location')
            dropoff_location = request.data.get('dropoff_location')
            current_cycle_used = float(request.data.get('current_cycle_used', 0))
            
            if not all([current_location, pickup_location, dropoff_location]):
                return Response(
                    {"error": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Geocode locations
            current_coords = geocode_address(current_location, maps_api_key)
            pickup_coords = geocode_address(pickup_location, maps_api_key)
            dropoff_coords = geocode_address(dropoff_location, maps_api_key)
            
            if not all([current_coords, pickup_coords, dropoff_coords]):
                return Response(
                    {"error": "Could not geocode one or more addresses"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate route: current -> pickup -> dropoff
            route_data = calculate_route(
                current_coords,
                dropoff_coords,
                via_pickup=pickup_coords,
                maps_api_key=maps_api_key
            )
            
            if not route_data:
                return Response(
                    {"error": "Could not calculate route"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate HOS schedule
            hos_schedule = generate_hos_schedule(
                route_data['distance'],
                current_cycle_used,
                has_pickup=True
            )
            
            # Create Trip
            trip = Trip.objects.create(
                current_location=current_location,
                pickup_location=pickup_location,
                dropoff_location=dropoff_location,
                current_cycle_used=current_cycle_used,
                total_distance=route_data['distance'],
                estimated_duration=route_data['duration']
            )
            
            # Create Route
            Route.objects.create(
                trip=trip,
                polyline=str(route_data.get('polyline', '')),
                waypoints=[current_coords, pickup_coords, dropoff_coords],
                stops=route_data.get('stops', [])
            )
            
            # Create Daily Logs
            start_date = datetime.now()
            for day_idx, day_schedule in enumerate(hos_schedule['daily_schedules']):
                log_date = start_date + timedelta(days=day_idx)
                
                daily_log = DailyLog.objects.create(
                    trip=trip,
                    log_date=log_date.date(),
                    off_duty_hours=day_schedule['off_duty_hours'],
                    sleeper_berth_hours=day_schedule['sleeper_berth_hours'],
                    driving_hours=day_schedule['driving_hours'],
                    on_duty_hours=day_schedule['on_duty_hours'],
                    total_distance=sum(seg['distance'] for seg in day_schedule['driving_segments']),
                    total_vehicle_miles=sum(seg['distance'] for seg in day_schedule['driving_segments']),
                    remarks=f"Day {day_idx + 1} of {hos_schedule['total_days']}"
                )
            
            serializer = TripSerializer(trip)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get all daily logs for a trip"""
        trip = self.get_object()
        logs = trip.daily_logs.all()
        serializer = DailyLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def route_info(self, request, pk=None):
        """Get route information for a trip"""
        trip = self.get_object()
        if hasattr(trip, 'route'):
            serializer = RouteSerializer(trip.route)
            return Response(serializer.data)
        return Response(
            {"error": "Route not found"},
            status=status.HTTP_404_NOT_FOUND
        )


class DailyLogViewSet(viewsets.ModelViewSet):
    queryset = DailyLog.objects.all()
    serializer_class = DailyLogSerializer
    permission_classes = [AllowAny]
    
    @action(detail=True, methods=['post'])
    def update_entries(self, request, pk=None):
        """Update log entries for a daily log"""
        daily_log = self.get_object()
        entries_data = request.data.get('entries', [])
        
        # Clear existing entries
        daily_log.entries.all().delete()
        
        # Create new entries
        for entry_data in entries_data:
            LogEntry.objects.create(
                daily_log=daily_log,
                **entry_data
            )
        
        serializer = DailyLogSerializer(daily_log)
        return Response(serializer.data)
