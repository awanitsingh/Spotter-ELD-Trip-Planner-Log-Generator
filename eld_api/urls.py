from django.urls import path
from . import views

urlpatterns = [
    path('calculate-trip/', views.calculate_trip, name='calculate_trip'),
]

