import React, { useState } from 'react';
import './App.css';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import LogSheets from './components/LogSheets';

function App() {
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tripLocations, setTripLocations] = useState(null);

  const handleTripSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/calculate-trip/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate trip');
      }

      const data = await response.json();
      setTripData(data);
      setTripLocations({
        current: formData.current_location,
        pickup: formData.pickup_location,
        dropoff: formData.dropoff_location
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚛 Full Stack Spotter</h1>
        <p>ELD Trip Planner & Log Generator</p>
      </header>
      
      <main className="app-main">
        <div className="container">
          <TripForm onSubmit={handleTripSubmit} loading={loading} />
          
          {error && (
            <div className="error-message">
              <p>Error: {error}</p>
            </div>
          )}
          
          {tripData && (
            <>
              <div className="results-section">
                <h2>Route Information</h2>
                <div className="route-stats">
                  <div className="stat-card">
                    <h3>Total Distance</h3>
                    <p>{tripData.route?.total_distance_miles?.toFixed(2) || '0.00'} miles</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Duration</h3>
                    <p>{tripData.route?.total_duration_hours?.toFixed(2) || '0.00'} hours</p>
                  </div>
                  <div className="stat-card">
                    <h3>Number of Days</h3>
                    <p>{tripData.eld_logs?.length || 0} day(s)</p>
                  </div>
                  <div className="stat-card">
                    <h3>Number of Segments</h3>
                    <p>{tripData.route?.segments?.length || 0} segment(s)</p>
                  </div>
                </div>
              </div>
              
              <RouteMap routeData={tripData.route} locations={tripLocations} />
              
              <LogSheets logs={tripData.eld_logs} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
