from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta

class Trip(models.Model):
    """Represents a single trip with origin and destination"""
    current_location = models.CharField(max_length=255, help_text="Starting location (address or coordinates)")
    pickup_location = models.CharField(max_length=255, help_text="Pickup location")
    dropoff_location = models.CharField(max_length=255, help_text="Dropoff location")
    current_cycle_used = models.FloatField(help_text="Hours already used in current 70-hour cycle")
    
    # Automatically calculated from route
    total_distance = models.FloatField(default=0, help_text="Total distance in miles")
    estimated_duration = models.FloatField(default=0, help_text="Estimated duration in hours")
    
    # Trip details
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Trip from {self.pickup_location} to {self.dropoff_location}"


class DailyLog(models.Model):
    """Represents a single day's ELD (Electronic Logging Device) log"""
    
    DUTY_CHOICES = [
        ('OFF', 'Off Duty'),
        ('SLEEPER', 'Sleeper Berth'),
        ('DRIVING', 'Driving'),
        ('ON_DUTY', 'On Duty (Not Driving)'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='daily_logs')
    log_date = models.DateField()
    
    # Total hours for each duty status on this day
    off_duty_hours = models.FloatField(default=0)
    sleeper_berth_hours = models.FloatField(default=0)
    driving_hours = models.FloatField(default=0)
    on_duty_hours = models.FloatField(default=0)
    
    # Total distance and vehicle info
    total_distance = models.FloatField(default=0)
    total_vehicle_miles = models.FloatField(default=0)
    
    # Remarks and locations
    remarks = models.TextField(blank=True, help_text="Trip details and location changes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['log_date']
        unique_together = ['trip', 'log_date']
    
    def __str__(self):
        return f"Log for {self.log_date}"
    
    def total_hours(self):
        """Return total hours for the day (should be 24)"""
        return (self.off_duty_hours + self.sleeper_berth_hours + 
                self.driving_hours + self.on_duty_hours)


class LogEntry(models.Model):
    """Individual hourly entries in a daily log"""
    
    daily_log = models.ForeignKey(DailyLog, on_delete=models.CASCADE, related_name='entries')
    hour = models.IntegerField()  # 0-23 for 24-hour period
    minute = models.IntegerField(default=0)  # 0-59
    duty_status = models.CharField(max_length=10, choices=DailyLog.DUTY_CHOICES)
    location = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['hour', 'minute']
    
    def __str__(self):
        return f"{self.daily_log.log_date} {self.hour:02d}:{self.minute:02d} - {self.duty_status}"


class Route(models.Model):
    """Stores route information from map API"""
    
    trip = models.OneToOneField(Trip, on_delete=models.CASCADE, related_name='route')
    
    # Route details
    polyline = models.TextField(help_text="Encoded polyline for map display")
    waypoints = models.JSONField(default=list, help_text="Array of waypoint coordinates")
    
    # Stops information
    stops = models.JSONField(default=list, help_text="Array of required stops (fuel, rest)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Route for trip {self.trip.id}"
