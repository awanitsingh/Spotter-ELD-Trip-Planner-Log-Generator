# Spotter - ELD Trip Planner & Log Generator

A full-stack application built with Django and React that calculates trip routes and generates Electronic Logging Device (ELD) daily log sheets for commercial drivers.

## Features

- **Trip Planning**: Input current location, pickup location, dropoff location, and current cycle hours
- **Route Calculation**: Automatically calculates route segments with stops for fueling (every 1,000 miles)
- **Interactive Map**: Displays route on an interactive map using OpenStreetMap/Leaflet
- **ELD Log Generation**: Automatically generates daily log sheets following FMCSA HOS regulations
- **HOS Compliance**: Implements 70-hour/8-day rule for property-carrying drivers
- **Beautiful UI**: Modern, responsive design with gradient backgrounds and card-based layouts

## Assumptions

- Property-carrying driver
- 70 hours/8 days cycle
- No adverse driving conditions
- Fueling at least once every 1,000 miles
- 1 hour for pickup and drop-off operations

## Technology Stack

### Backend
- Django 6.0
- Django REST Framework
- Python 3.x

### Frontend
- React 18
- Leaflet/OpenStreetMap for mapping
- Modern CSS with gradients and responsive design

## Installation & Setup

### Prerequisites
- Python 3.x
- Node.js and npm
- Virtual environment (recommended)

### Backend Setup

1. Navigate to the project directory:
```bash
cd /Users/AwanitSingh/Desktop/FullStack_Spotter
```

2. Activate the virtual environment:
```bash
source venv/bin/activate
```

3. Install dependencies (if not already installed):
```bash
pip install -r requirements.txt
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Start the Django development server:
```bash
python manage.py runserver
```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Usage

1. Open the application in your browser at `http://localhost:3000`
2. Fill in the trip details form:
   - Current Location
   - Pickup Location
   - Dropoff Location
   - Current Cycle Used (Hours)
3. Click "Calculate Trip & Generate Logs"
4. View the route on the interactive map
5. Review the generated ELD log sheets for each day of the trip

## API Endpoints

### POST `/api/calculate-trip/`

Calculate trip route and generate ELD logs.

**Request Body:**
```json
{
  "current_location": "New York, NY",
  "pickup_location": "Philadelphia, PA",
  "dropoff_location": "Chicago, IL",
  "current_cycle_used": 10.5
}
```

**Response:**
```json
{
  "route": {
    "segments": [...],
    "total_distance_miles": 1350.0,
    "total_duration_hours": 24.5
  },
  "eld_logs": [...]
}
```

## Project Structure

```
Spotter/
├── backend/              # Django project settings
├── eld_api/              # Django app with API views
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── TripForm.js
│   │   │   ├── RouteMap.js
│   │   │   └── LogSheets.js
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
├── requirements.txt      # Python dependencies
└── README.md
```

## Features Implementation

### Route Calculation
- Calculates route segments from current location → pickup → dropoff
- Automatically adds fueling stops every 1,000 miles
- Includes 1-hour stops for pickup and dropoff operations

### ELD Log Generation
- Generates daily log sheets following FMCSA format
- Tracks duty status: Off Duty, Sleeper Berth, Driving, On Duty (not driving)
- Calculates HOS compliance (70-hour/8-day rule)
- Draws timeline graphs showing duty status throughout the day
- Provides recap section with total hours

### Map Integration
- Uses OpenStreetMap (free, no API key required)
- Displays route with markers for key stops
- Shows segment information in popups

## Notes

- The current implementation uses mock coordinates for route visualization. For production use, integrate with a routing API like OpenRouteService or Google Maps API.
- The route calculation uses approximate distances and durations. Real-world implementation would use actual routing APIs.
- Log sheets are rendered using HTML5 Canvas for drawing the timeline graphs.

## License

This project is for assessment/demonstration purposes.

