import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Segment type configurations with icons and colors
const segmentConfig = {
  'drive_to_pickup': {
    icon: '🚛',
    color: '#10b981',
    label: 'DT',
    name: 'Drive to Pickup'
  },
  'pickup': {
    icon: '📦',
    color: '#3b82f6',
    label: 'P',
    name: 'Pickup'
  },
  'fueling': {
    icon: '⛽',
    color: '#8b5cf6',
    label: 'F',
    name: 'Fueling'
  },
  'drive_to_dropoff': {
    icon: '🚚',
    color: '#f59e0b',
    label: 'DD',
    name: 'Drive to Dropoff'
  },
  'dropoff': {
    icon: '✅',
    color: '#ef4444',
    label: 'D',
    name: 'Dropoff'
  }
};

// Create custom icons for different segment types
const createSegmentIcon = (segmentType) => {
  const config = segmentConfig[segmentType] || {
    icon: '📍',
    color: '#667eea',
    label: '?',
    name: 'Unknown'
  };
  
  return L.divIcon({
    className: 'custom-segment-marker',
    html: `
      <div class="segment-marker-pin" style="background-color: ${config.color};">
        <span class="segment-marker-icon">${config.icon}</span>
        <span class="segment-marker-label">${config.label}</span>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  });
};

// Create custom icons for key locations
const createCustomIcon = (color, label, icon) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin" style="background-color: ${color};">
        <span class="marker-icon">${icon || ''}</span>
        <span class="marker-label">${label}</span>
      </div>
    `,
    iconSize: [35, 48],
    iconAnchor: [17.5, 48],
    popupAnchor: [0, -48],
  });
};

const RouteMap = ({ routeData, locations }) => {
  if (!routeData || !routeData.segments) {
    return null;
  }

  // Generate map coordinates from segments
  const getMapCoordinates = () => {
    const coordinates = [];
    if (!routeData.segments) return coordinates;
    
    routeData.segments.forEach((segment) => {
      if (segment.coordinates && Array.isArray(segment.coordinates) && segment.coordinates.length > 0) {
        // Ensure coordinates are in correct format [lat, lng]
        segment.coordinates.forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            coordinates.push([coord[0], coord[1]]);
          }
        });
      }
    });
    
    // If no coordinates found, try to get from key locations
    if (coordinates.length === 0 && routeData.key_locations) {
      if (routeData.key_locations.current?.coordinates) {
        coordinates.push(routeData.key_locations.current.coordinates);
      }
      if (routeData.key_locations.pickup?.coordinates) {
        coordinates.push(routeData.key_locations.pickup.coordinates);
      }
      if (routeData.key_locations.dropoff?.coordinates) {
        coordinates.push(routeData.key_locations.dropoff.coordinates);
      }
    }
    
    return coordinates;
  };

  // Get coordinates for key locations
  const getLocationCoordinates = () => {
    const coords = {};
    
    // Use key_locations from backend if available (preferred)
    if (routeData.key_locations) {
      if (routeData.key_locations.current && routeData.key_locations.current.coordinates) {
        const currentCoords = routeData.key_locations.current.coordinates;
        if (Array.isArray(currentCoords) && currentCoords.length >= 2) {
          coords.current = [currentCoords[0], currentCoords[1]];
        }
      }
      if (routeData.key_locations.pickup && routeData.key_locations.pickup.coordinates) {
        const pickupCoords = routeData.key_locations.pickup.coordinates;
        if (Array.isArray(pickupCoords) && pickupCoords.length >= 2) {
          coords.pickup = [pickupCoords[0], pickupCoords[1]];
        }
      }
      if (routeData.key_locations.dropoff && routeData.key_locations.dropoff.coordinates) {
        const dropoffCoords = routeData.key_locations.dropoff.coordinates;
        if (Array.isArray(dropoffCoords) && dropoffCoords.length >= 2) {
          coords.dropoff = [dropoffCoords[0], dropoffCoords[1]];
        }
      }
    }
    
    // Fallback to segment-based coordinates
    if (routeData.segments && routeData.segments.length > 0) {
      // Current location - first segment start (drive_to_pickup)
      if (!coords.current) {
        const firstSegment = routeData.segments.find(s => s.type === 'drive_to_pickup');
        if (firstSegment && firstSegment.coordinates && Array.isArray(firstSegment.coordinates) && firstSegment.coordinates.length > 0) {
          const firstCoord = firstSegment.coordinates[0];
          if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
            coords.current = [firstCoord[0], firstCoord[1]];
          }
        }
      }
      
      // If still no current location, use default
      if (!coords.current) {
        coords.current = [40.7128, -74.0060]; // Default NYC
      }

      // Pickup location - segment after pickup
      if (!coords.pickup) {
        const afterPickupSegment = routeData.segments.find(s => s.type === 'drive_to_dropoff');
        if (afterPickupSegment && afterPickupSegment.coordinates && Array.isArray(afterPickupSegment.coordinates) && afterPickupSegment.coordinates.length > 0) {
          const pickupCoord = afterPickupSegment.coordinates[0];
          if (Array.isArray(pickupCoord) && pickupCoord.length >= 2) {
            coords.pickup = [pickupCoord[0], pickupCoord[1]];
          }
        }
      }
      
      if (!coords.pickup) {
        coords.pickup = [40.7580, -73.9855]; // Default
      }

      // Dropoff location - last segment end
      if (!coords.dropoff) {
        const dropoffSegment = routeData.segments.find(s => s.type === 'dropoff');
        if (dropoffSegment && dropoffSegment.coordinates && Array.isArray(dropoffSegment.coordinates) && dropoffSegment.coordinates.length > 0) {
          const lastCoord = dropoffSegment.coordinates[dropoffSegment.coordinates.length - 1];
          if (Array.isArray(lastCoord) && lastCoord.length >= 2) {
            coords.dropoff = [lastCoord[0], lastCoord[1]];
          }
        } else {
          const afterPickupSegment = routeData.segments.find(s => s.type === 'drive_to_dropoff');
          if (afterPickupSegment && afterPickupSegment.coordinates && Array.isArray(afterPickupSegment.coordinates) && afterPickupSegment.coordinates.length > 0) {
            const lastCoord = afterPickupSegment.coordinates[afterPickupSegment.coordinates.length - 1];
            if (Array.isArray(lastCoord) && lastCoord.length >= 2) {
              coords.dropoff = [lastCoord[0], lastCoord[1]];
            }
          }
        }
      }
      
      if (!coords.dropoff) {
        coords.dropoff = [41.8781, -87.6298]; // Default Chicago
      }
    } else {
      // If no segments, set defaults
      if (!coords.current) coords.current = [40.7128, -74.0060];
      if (!coords.pickup) coords.pickup = [40.7580, -73.9855];
      if (!coords.dropoff) coords.dropoff = [41.8781, -87.6298];
    }
    
    return coords;
  };

  // Get coordinates for each segment
  const getSegmentCoordinates = (segment) => {
    if (segment.coordinates && segment.coordinates.length > 0) {
      // For driving segments, use the middle point
      if (segment.type === 'drive_to_pickup' || segment.type === 'drive_to_dropoff') {
        const midIndex = Math.floor(segment.coordinates.length / 2);
        return segment.coordinates[midIndex];
      }
      // For stop segments, use the first coordinate
      return segment.coordinates[0];
    }
    return null;
  };

  const mapCoordinates = getMapCoordinates();
  const locationCoords = getLocationCoordinates();
  
  // Debug: Log coordinates to help troubleshoot
  if (process.env.NODE_ENV === 'development') {
    console.log('Location Coordinates:', locationCoords);
    console.log('Locations prop:', locations);
    console.log('Route Data:', routeData);
  }
  
  // Calculate center point from all coordinates
  const calculateCenter = () => {
    if (mapCoordinates.length === 0) {
      return [40.7128, -74.0060]; // Default center
    }
    
    // Calculate bounding box
    let minLat = mapCoordinates[0][0];
    let maxLat = mapCoordinates[0][0];
    let minLng = mapCoordinates[0][1];
    let maxLng = mapCoordinates[0][1];
    
    mapCoordinates.forEach(coord => {
      minLat = Math.min(minLat, coord[0]);
      maxLat = Math.max(maxLat, coord[0]);
      minLng = Math.min(minLng, coord[1]);
      maxLng = Math.max(maxLng, coord[1]);
    });
    
    // Return center of bounding box
    return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
  };
  
  const center = calculateCenter();
  
  // Calculate appropriate zoom level
  const calculateZoom = () => {
    if (mapCoordinates.length === 0) return 6;
    
    // Calculate bounding box span
    let minLat = mapCoordinates[0][0];
    let maxLat = mapCoordinates[0][0];
    let minLng = mapCoordinates[0][1];
    let maxLng = mapCoordinates[0][1];
    
    mapCoordinates.forEach(coord => {
      minLat = Math.min(minLat, coord[0]);
      maxLat = Math.max(maxLat, coord[0]);
      minLng = Math.min(minLng, coord[1]);
      maxLng = Math.max(maxLng, coord[1]);
    });
    
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan);
    
    // Determine zoom based on span
    if (maxSpan > 20) return 4;
    if (maxSpan > 10) return 5;
    if (maxSpan > 5) return 6;
    if (maxSpan > 2) return 7;
    if (maxSpan > 1) return 8;
    return 9;
  };
  
  const zoom = calculateZoom();

  return (
    <div className="route-map-container">
      <div className="section-header">
        <h2>📍 Route Map</h2>
        <p>Interactive route visualization with all segments and stops</p>
      </div>
      <div className="map-wrapper">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '600px', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Current Location Marker - Always show if coordinates are available */}
          {locationCoords.current && Array.isArray(locationCoords.current) && locationCoords.current.length >= 2 && (
            <Marker 
              position={locationCoords.current}
              icon={createCustomIcon('#10b981', 'C', '📍')}
            >
              <Popup>
                <div className="location-popup">
                  <h4>📍 Current Location</h4>
                  <p><strong>{locations?.current || 'Current Location'}</strong></p>
                  <p style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.5rem' }}>
                    Coordinates: {locationCoords.current[0].toFixed(4)}, {locationCoords.current[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Pickup Location Marker */}
          {locationCoords.pickup && Array.isArray(locationCoords.pickup) && locationCoords.pickup.length >= 2 && locations?.pickup && (
            <Marker 
              position={locationCoords.pickup}
              icon={createCustomIcon('#3b82f6', 'P', '📦')}
            >
              <Popup>
                <div className="location-popup">
                  <h4>📦 Pickup Location</h4>
                  <p><strong>{locations.pickup}</strong></p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dropoff Location Marker */}
          {locationCoords.dropoff && Array.isArray(locationCoords.dropoff) && locationCoords.dropoff.length >= 2 && locations?.dropoff && (
            <Marker 
              position={locationCoords.dropoff}
              icon={createCustomIcon('#ef4444', 'D', '✅')}
            >
              <Popup>
                <div className="location-popup">
                  <h4>✅ Dropoff Location</h4>
                  <p><strong>{locations.dropoff}</strong></p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Polyline */}
          {mapCoordinates.length > 0 && (
            <Polyline
              positions={mapCoordinates}
              color="#667eea"
              weight={5}
              opacity={0.8}
            />
          )}

          {/* All Segment Markers */}
          {routeData.segments && routeData.segments.map((segment, index) => {
            const segmentCoord = getSegmentCoordinates(segment);
            if (!segmentCoord) return null;

            const config = segmentConfig[segment.type] || {
              icon: '📍',
              color: '#667eea',
              label: '?',
              name: segment.type.replace('_', ' ').toUpperCase()
            };

            return (
              <Marker 
                key={`segment-${index}`}
                position={segmentCoord}
                icon={createSegmentIcon(segment.type)}
              >
                <Popup>
                  <div className="segment-popup">
                    <div className="popup-header">
                      <span className="popup-icon">{config.icon}</span>
                      <strong>{config.name}</strong>
                    </div>
                    <div className="popup-details">
                      <p><strong>From:</strong> {segment.from}</p>
                      <p><strong>To:</strong> {segment.to}</p>
                      {segment.distance_miles > 0 && (
                        <p><strong>Distance:</strong> {segment.distance_miles.toFixed(2)} miles</p>
                      )}
                      {segment.duration_hours > 0 && (
                        <p><strong>Duration:</strong> {segment.duration_hours.toFixed(2)} hours</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Complete Legend */}
      <div className="location-legend">
        <h4 className="legend-title">Map Legend</h4>
        <div className="legend-grid">
          <div className="legend-item">
            <div className="legend-marker" style={{ backgroundColor: '#10b981' }}>
              <span className="legend-icon">📍</span>
            </div>
            <span>Current Location</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker segment-marker" style={{ backgroundColor: '#10b981' }}>
              <span className="legend-icon">🚛</span>
            </div>
            <span>Drive to Pickup</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker segment-marker" style={{ backgroundColor: '#3b82f6' }}>
              <span className="legend-icon">📦</span>
            </div>
            <span>Pickup</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker segment-marker" style={{ backgroundColor: '#8b5cf6' }}>
              <span className="legend-icon">⛽</span>
            </div>
            <span>Fueling</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker segment-marker" style={{ backgroundColor: '#f59e0b' }}>
              <span className="legend-icon">🚚</span>
            </div>
            <span>Drive to Dropoff</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker segment-marker" style={{ backgroundColor: '#ef4444' }}>
              <span className="legend-icon">✅</span>
            </div>
            <span>Dropoff</span>
          </div>
        </div>
      </div>
      
      <div className="route-segments">
        <h3>Route Segments</h3>
        <div className="segments-list">
          {routeData.segments.map((segment, index) => {
            const config = segmentConfig[segment.type] || {
              icon: '📍',
              color: '#667eea',
              name: segment.type.replace('_', ' ').toUpperCase()
            };
            
            return (
              <div key={index} className="segment-card">
                <div className={`segment-type segment-${segment.type}`}>
                  <span className="segment-icon">{config.icon}</span>
                  <span>{config.name}</span>
                </div>
                <div className="segment-details">
                  <p><strong>From:</strong> {segment.from}</p>
                  <p><strong>To:</strong> {segment.to}</p>
                  {segment.distance_miles > 0 && (
                    <p><strong>Distance:</strong> {segment.distance_miles.toFixed(2)} miles</p>
                  )}
                  {segment.duration_hours > 0 && (
                    <p><strong>Duration:</strong> {segment.duration_hours.toFixed(2)} hours</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
