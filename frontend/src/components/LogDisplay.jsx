import { useState } from 'react'
import ELDLogSheet from './ELDLogSheet'
import './LogDisplay.css'

function LogDisplay({ logs }) {
  const [selectedLogIdx, setSelectedLogIdx] = useState(0)

  if (!logs || logs.length === 0) {
    return <div className="no-logs">No logs generated yet</div>
  }

  const currentLog = logs[selectedLogIdx]

  return (
    <div className="log-display">
      <div className="log-tabs">
        <div className="tabs-header">
          <h3>Day {selectedLogIdx + 1} of {logs.length}</h3>
          <div className="tab-buttons">
            {logs.map((log, idx) => (
              <button
                key={idx}
                className={`tab-btn ${selectedLogIdx === idx ? 'active' : ''}`}
                onClick={() => setSelectedLogIdx(idx)}
              >
                Day {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="log-content">
        <div className="log-stats">
          <div className="stat-grid">
            <div className="stat-box off-duty">
              <label>Off Duty</label>
              <span className="value">{currentLog.off_duty_hours.toFixed(1)}h</span>
            </div>
            <div className="stat-box sleeper">
              <label>Sleeper Berth</label>
              <span className="value">{currentLog.sleeper_berth_hours.toFixed(1)}h</span>
            </div>
            <div className="stat-box driving">
              <label>Driving</label>
              <span className="value">{currentLog.driving_hours.toFixed(1)}h</span>
            </div>
            <div className="stat-box on-duty">
              <label>On Duty</label>
              <span className="value">{currentLog.on_duty_hours.toFixed(1)}h</span>
            </div>
          </div>
        </div>

        <ELDLogSheet 
          log={currentLog} 
          date={logs[selectedLogIdx].log_date}
          dayNumber={selectedLogIdx + 1}
          totalDays={logs.length}
        />

        <div className="log-details">
          <h3>Trip Details for Day {selectedLogIdx + 1}</h3>
          <p><strong>Date:</strong> {currentLog.log_date}</p>
          <p><strong>Total Distance:</strong> {currentLog.total_distance.toFixed(1)} miles</p>
          <p><strong>Total Vehicle Miles:</strong> {currentLog.total_vehicle_miles.toFixed(1)} miles</p>
          {currentLog.remarks && (
            <p><strong>Remarks:</strong> {currentLog.remarks}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LogDisplay
