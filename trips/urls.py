from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TripViewSet, DailyLogViewSet

router = DefaultRouter()
router.register(r'trips', TripViewSet, basename='trip')
router.register(r'logs', DailyLogViewSet, basename='daily-log')

urlpatterns = [
    path('', include(router.urls)),
]
