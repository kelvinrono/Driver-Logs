import { useState } from 'react'
import './App.css'
import TripForm from './components/TripForm'
import RouteMap from './components/RouteMap'
import LogDisplay from './components/LogDisplay'

function App() {
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleTripSubmit = async (formData) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8000/api/trips/calculate_route/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate route')
      }
      
      const data = await response.json()
      setTripData(data)
    } catch (err) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ELD Trip Planner</h1>
        <p>Electronic Logging Device - Hours of Service Calculator</p>
      </header>
      
      <main className="app-main">
        <div className="form-section">
          <TripForm onSubmit={handleTripSubmit} loading={loading} />
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="results-section">
          <div className="map-section">
            <h2>Route Information</h2>
            <RouteMap trip={tripData} loading={loading} />
            {tripData && (
              <div className="trip-stats">
                <div className="stat">
                  <span>Total Distance:</span>
                  <strong>{tripData.total_distance} miles</strong>
                </div>
                <div className="stat">
                  <span>Estimated Duration:</span>
                  <strong>{tripData.estimated_duration.toFixed(1)} hours</strong>
                </div>
              </div>
            )}
          </div>
          
          {tripData && (
            <div className="logs-section">
              <h2>Daily ELD Logs</h2>
              <LogDisplay logs={tripData.daily_logs} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
