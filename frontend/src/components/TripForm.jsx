import { useState } from 'react'
import './TripForm.css'

function TripForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'current_cycle_used' ? parseFloat(value) || 0 : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.current_location || !formData.pickup_location || !formData.dropoff_location) {
      alert('Please fill in all location fields')
      return
    }
    onSubmit(formData)
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <h2>Plan Your Trip</h2>
      
      <div className="form-group">
        <label htmlFor="current_location">Current Location *</label>
        <input
          type="text"
          id="current_location"
          name="current_location"
          value={formData.current_location}
          onChange={handleChange}
          placeholder="e.g., Chicago, IL or address"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="pickup_location">Pickup Location *</label>
        <input
          type="text"
          id="pickup_location"
          name="pickup_location"
          value={formData.pickup_location}
          onChange={handleChange}
          placeholder="e.g., New York, NY or address"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="dropoff_location">Dropoff Location *</label>
        <input
          type="text"
          id="dropoff_location"
          name="dropoff_location"
          value={formData.dropoff_location}
          onChange={handleChange}
          placeholder="e.g., Los Angeles, CA or address"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="current_cycle_used">Hours Used in Current Cycle</label>
        <input
          type="number"
          id="current_cycle_used"
          name="current_cycle_used"
          value={formData.current_cycle_used}
          onChange={handleChange}
          placeholder="0"
          min="0"
          max="70"
          step="0.5"
        />
        <small>70-hour/8-day cycle remaining: {(70 - formData.current_cycle_used).toFixed(1)}h</small>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Calculating...' : 'Calculate Route & Generate Logs'}
      </button>
    </form>
  )
}

export default TripForm
