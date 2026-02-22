# ELD Trip Planner - Full Stack Application

A comprehensive Electronic Logging Device (ELD) trip planning application that calculates routes, generates HOS (Hours of Service) compliant daily logs, and provides visual route information for truck drivers.

## Features

- 🗺️ **Interactive Route Planning** - Input current location, pickup, and dropoff addresses
- 📊 **HOS Compliance Calculation** - Generates FMCSA-compliant 70-hour/8-day cycle schedules
- 📋 **Automated ELD Log Generation** - Creates daily logs for multi-day trips
- 📈 **Visual Route Display** - Interactive map showing route with stops
- 💾 **Export Capabilities** - Download generated logs as images
- 🎨 **Professional UI/UX** - Clean, modern interface optimized for driver usability

## Architecture

```
drive-log-app/
├── backend/                    # Django REST API
│   ├── eldtracker/            # Main project settings
│   ├── trips/                 # Django app (models, views, serializers)
│   ├── manage.py
│   └── requirements.txt
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── vite.config.js
└── .env                        # Environment configuration
```

## Prerequisites

- Python 3.11+
- Node.js 16+
- npm 8+
- Git

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and update with your API keys:

```bash
cp .env.example .env
```

Update `.env` with:

```env
# Backend Configuration
DEBUG=True
SECRET_KEY=your-secret-key-here

# Map API Configuration
# Get your free API key from OpenRouteService
OPENROUTE_API_KEY=your-openroute-api-key-here

# Frontend URLs
FRONTEND_URL=http://localhost:5173
REACT_APP_API_URL=http://localhost:8000/api
```

### 2. Get a Free OpenRouteService API Key

The app uses **OpenRouteService**, which offers a free tier perfect for development.

**Steps to get your API key:**
1. Visit https://openrouteservice.org/dev/#/login
2. Click "Sign Up" to create a free account
3. Verify your email
4. Go to your dashboard
5. Click "Create a new token" in the API Keys section
6. Name it something like "ELD Trip Planner"
7. Copy the token and paste it in your `.env` file as `OPENROUTE_API_KEY`

**Free Tier Limits:**
- 2,500 requests/day
- Suitable for development and testing
- Perfect for a single user or small fleet

### 3. Backend Setup

```bash
# Navigate to project root
cd drive-log-app

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\Activate.ps1
# On Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install django djangorestframework django-cors-headers python-dotenv requests

# Apply migrations
python manage.py migrate

# Create superuser (optional, for admin panel)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend will run on: http://localhost:8000

### 4. Frontend Setup

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install npm dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: http://localhost:5173

## Project Structure Details

### Backend (Django)

**Models:**
- `Trip` - Represents a complete trip with origin, pickup, and destination
- `DailyLog` - Single day's ELD log with duty hour totals
- `LogEntry` - Individual hourly entries for a day
- `Route` - Route information including stops and waypoints

**API Endpoints:**
- `POST /api/trips/calculate_route/` - Calculate route and generate logs
- `GET /api/trips/` - List all trips
- `GET /api/trips/{id}/logs/` - Get logs for a specific trip
- `GET /api/trips/{id}/route_info/` - Get route details
- `GET /api/logs/` - List all daily logs

**Key Features:**
- OpenRouteService integration for real routing
- Automatic HOS schedule generation
- CORS-enabled for frontend access
- RESTful API design

### Frontend (React + Vite)

**Components:**
- `App.jsx` - Main application component
- `TripForm.jsx` - Input form for trip details
- `RouteMap.jsx` - Map display and stops information
- `LogDisplay.jsx` - Daily log viewer with tabs
- `ELDLogSheet.jsx` - Canvas-based ELD log grid drawing

**Features:**
- Real-time form validation
- Interactive map visualization
- Multi-day log display
- Canvas-based grid drawing
- Export logs as PNG
- Responsive design for all devices

## HOS Calculations

The app follows FMCSA regulations for property-carrying drivers:

- **Maximum Continuous Driving:** 11 hours
- **14-Hour Driving Window:** 14 consecutive hours to drive up to 11 hours
- **Mandatory Rest Break:** 30 minutes after 8 hours of driving
- **Minimum Off-Duty Period:** 10 hours before next driving window
- **70-Hour Cycle:** 70 hours on-duty in any 8-day period
- **Fuel Stops:** Every 1,000 miles
- **Pickup/Dropoff Time:** 1 hour each

## API Response Example

```json
{
  "id": 1,
  "current_location": "Chicago, IL",
  "pickup_location": "New York, NY",
  "dropoff_location": "Los Angeles, CA",
  "current_cycle_used": 35,
  "total_distance": 2015.5,
  "estimated_duration": 33.59,
  "daily_logs": [
    {
      "id": 1,
      "log_date": "2026-02-21",
      "off_duty_hours": 8.5,
      "sleeper_berth_hours": 0,
      "driving_hours": 11,
      "on_duty_hours": 4.5,
      "total_distance": 660,
      "total_vehicle_miles": 660,
      "remarks": "Day 1 of 3"
    }
  ],
  "route": {
    "polyline": "...",
    "waypoints": [...],
    "stops": [
      {
        "type": "fuel",
        "distance_at": 1000,
        "duration_hours": 0.5,
        "lat": 40.7128,
        "lng": -74.0060
      }
    ]
  }
}
```

## Troubleshooting

### "Maps API key not configured"
- Ensure `OPENROUTE_API_KEY` is set in `.env`
- Restart Django server after updating `.env`

### CORS Errors
- Check that `CORS_ALLOWED_ORIGINS` in Django settings includes your frontend URL
- Frontend runs on `http://localhost:5173` by default

### Port Already in Use
- Django: `python manage.py runserver 8001`
- React: `npm run dev -- --port 3000`

### Dependencies Installation Issues
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules`: `rm -rf node_modules`
- Reinstall: `npm install`

## Development Tips

### Database
- Using SQLite3 for development
- Data persists in `db.sqlite3`
- To reset: `rm db.sqlite3` then `python manage.py migrate`

### Django Admin
- Access at: http://localhost:8000/admin
- Login with credentials from `createsuperuser`

### Hot Reload
- Frontend: Vite provides instant hot reload
- Backend: Django auto-reloads on code changes

## Production Deployment

For production deployment, consider:

1. **Backend:**
   - Use PostgreSQL instead of SQLite
   - Set `DEBUG=False`
   - Use a WSGI server (Gunicorn, uWSGI)
   - Configure proper CORS settings

2. **Frontend:**
   - Run `npm run build` for optimized bundle
   - Deploy to CDN or static host
   - Update API URLs for production

3. **Security:**
   - Use environment-specific .env files
   - Add HTTPS/SSL certificates
   - Implement rate limiting
   - Add authentication if needed

## Performance Optimization

- Route calculations are cached
- Frontend lazy loads components
- Vite provides fast bundling
- Django ORM optimizations with select_related()

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Contributing

When contributing:
1. Follow PEP 8 for Python code
2. Use ESLint for JavaScript
3. Write meaningful commit messages
4. Test API endpoints with curl or Postman

## License

[Specify your license here]

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review API documentation
3. Check environment configuration
4. Ensure all dependencies are installed

## Future Enhancements

- Additional map providers (Google Maps, Mapbox)
- Real-time traffic integration
- User authentication and trip history
- Multiple driver management
- PDF export for offline access
- Mobile app with notifications
- Real-time vehicle tracking
- Integration with ELDs hardware
