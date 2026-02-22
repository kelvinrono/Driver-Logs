import { useEffect, useRef } from 'react'
import './RouteMap.css'

function RouteMap({ trip, loading }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    // Wait for Leaflet to be available
    if (typeof window.L === 'undefined') {
      console.error('Leaflet not loaded')
      return
    }

    // Only initialize if we have trip data
    if (!trip?.route?.waypoints || trip.route.waypoints.length === 0) {
      return
    }

    const waypoints = trip.route.waypoints
    const centerLat = waypoints.reduce((sum, wp) => sum + wp.lat, 0) / waypoints.length
    const centerLng = waypoints.reduce((sum, wp) => sum + wp.lng, 0) / waypoints.length

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Initialize map
    try {
      const map = window.L.map(mapRef.current).setView([centerLat, centerLng], 5)
      mapInstanceRef.current = map

      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)

      // Add geocoder search control
      if (window.L.Control && window.L.Control.Geocoder) {
        window.L.Control.geocoder({
          defaultMarkGeocode: false,
          placeholder: 'Search for a location...',
          errorMessage: 'Location not found',
          collapsed: false,
          position: 'topright'
        })
          .on('markgeocode', function(e) {
            const bbox = e.geocode.bbox
            const poly = window.L.polygon([
              bbox.getSouthEast(),
              bbox.getNorthEast(),
              bbox.getNorthWest(),
              bbox.getSouthWest()
            ])
            map.fitBounds(poly.getBounds())
            
            // Add a temporary marker for the searched location
            window.L.marker(e.geocode.center)
              .addTo(map)
              .bindPopup(e.geocode.name)
              .openPopup()
          })
          .addTo(map)
      }

      // Add markers for waypoints
      waypoints.forEach((wp, idx) => {
        const icon = idx === 0 ? '📍' : idx === waypoints.length - 1 ? '🏁' : '📦'
        window.L.marker([wp.lat, wp.lng])
          .addTo(map)
          .bindPopup(icon + ' Waypoint ' + (idx + 1))
      })

      // Add markers for stops (fuel/rest)
      const stops = trip.route.stops || []
      stops.forEach((stop) => {
        if (stop.lat && stop.lng) {
          const icon = stop.type === 'fuel' ? '⛽' : '💤'
          window.L.marker([stop.lat, stop.lng])
            .addTo(map)
            .bindPopup(icon + ' ' + stop.type.charAt(0).toUpperCase() + stop.type.slice(1) + ' Stop')
        }
      })

      // Draw polyline if available
      if (waypoints.length >= 2) {
        const latLngs = waypoints.map(wp => [wp.lat, wp.lng])
        window.L.polyline(latLngs, { color: 'blue', weight: 3, opacity: 0.7 }).addTo(map)
      }

      // Fit bounds to show all markers
      const bounds = waypoints.map(wp => [wp.lat, wp.lng])
      map.fitBounds(bounds, { padding: [50, 50] })
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [trip])

  return (
    <div className="route-map">
      {loading ? (
        <div className="no-map loading-map">
          <p>Loading...</p>
        </div>
      ) : trip?.route?.waypoints && trip.route.waypoints.length > 0 ? (
        <div 
          ref={mapRef}
          className="map-container"
          style={{ width: '100%', height: '400px', borderRadius: '8px', marginBottom: '20px' }}
        />
      ) : (
        <div className="no-map">
          <p>Search to see the map</p>
        </div>
      )}
      
      {trip && trip.route && trip.route.stops && trip.route.stops.length > 0 && (
        <div className="stops-list">
          <h3>Planned Stops</h3>
          <ul>
            {trip.route.stops.map((stop, idx) => (
              <li key={idx} className={`stop-item ${stop.type}`}>
                <span className="stop-icon">
                  {stop.type === 'fuel' ? '⛽' : '💤'}
                </span>
                <span className="stop-info">
                  <strong>{stop.type.toUpperCase()}</strong> at {stop.distance_at} miles
                  ({stop.duration_hours}h stop)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default RouteMap
