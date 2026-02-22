import { useRef, useEffect, useState } from 'react'
import html2canvas from 'html2canvas'
import './ELDLogSheet.css'

function ELDLogSheet({ log, date, dayNumber, totalDays }) {
  const canvasRef = useRef(null)
  const logSheetRef = useRef(null)
  const [entries, setEntries] = useState([])
  const [remarks, setRemarks] = useState([])
  const [isExporting, setIsExporting] = useState(false)

  // Initialize entries from log data (using 15-minute intervals)
  useEffect(() => {
    const initialEntries = []
    
    // Convert hours to 15-minute intervals (total 96 intervals in 24 hours)
    let intervalsRemaining = {
      OFF: Math.round(log.off_duty_hours * 4),
      SLEEPER: Math.round(log.sleeper_berth_hours * 4),
      DRIVING: Math.round(log.driving_hours * 4),
      ON_DUTY: Math.round(log.on_duty_hours * 4)
    }

    // Fill intervals: driving first, then on_duty, then sleeper, then off
    const dutyOrder = ['DRIVING', 'ON_DUTY', 'SLEEPER', 'OFF']
    let currentInterval = 0

    for (let dutyType of dutyOrder) {
      while (intervalsRemaining[dutyType] > 0 && currentInterval < 96) {
        initialEntries.push({
          interval: currentInterval,
          duty_status: dutyType
        })
        intervalsRemaining[dutyType] -= 1
        currentInterval += 1
      }
    }

    setEntries(initialEntries)
  }, [log])

  // Draw the ELD log sheet
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)

    // Configuration
    const leftMargin = 50
    const topMargin = 25
    const cellWidth = (width - leftMargin) / 96 // 96 intervals (15-min each)
    const rowHeight = (height - topMargin - 5) / 4 // 4 duty status rows

    // Draw time header (hour markers at 0, 4, 8, 12, 16, 20, 24)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    
    for (let h = 0; h <= 24; h++) {
      const x = leftMargin + (h * 4 * cellWidth)
      const displayHour = h === 24 ? '24' : h.toString().padStart(2, '0')
      ctx.fillText(displayHour, x, 20)
      
      // Draw main hour lines
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, topMargin)
      ctx.lineTo(x, topMargin + rowHeight * 4)
      ctx.stroke()
    }

    // Draw duty status rows and individual cells
    const dutyStatuses = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty (Not Driving)']
    const dutyKeys = ['OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY']
    const colors = {
      OFF: '#999999',
      SLEEPER: '#4caf50',
      DRIVING: '#ff6b6b',
      ON_DUTY: '#ffa500'
    }

    for (let row = 0; row < dutyStatuses.length; row++) {
      const y = topMargin + row * rowHeight
      
      // Draw row label
      ctx.fillStyle = '#000'
      ctx.font = 'bold 9px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(dutyStatuses[row], leftMargin - 5, y + rowHeight / 2 + 3)
      
      // Draw cells for this row
      for (let interval = 0; interval < 96; interval++) {
        const x = leftMargin + interval * cellWidth
        
        // Check if this interval has an entry for this duty status
        const hasEntry = entries.find(
          e => e.interval === interval && e.duty_status === dutyKeys[row]
        )
        
        // Draw cell background
        if (hasEntry) {
          ctx.fillStyle = colors[dutyKeys[row]]
          ctx.fillRect(x, y, cellWidth, rowHeight)
        }
        
        // Draw cell border (light grid)
        ctx.strokeStyle = '#ddd'
        ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cellWidth, rowHeight)
      }
      
      // Draw row bottom border
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(leftMargin, y + rowHeight)
      ctx.lineTo(width, y + rowHeight)
      ctx.stroke()
    }

    // Draw outer border
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(leftMargin, topMargin, width - leftMargin - 5, rowHeight * 4)

  }, [entries])

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Account for canvas scaling - convert display coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const width = canvas.width
    const height = canvas.height
    const leftMargin = 50
    const topMargin = 25
    const cellWidth = (width - leftMargin) / 96
    const rowHeight = (height - topMargin - 5) / 4

    // Calculate which cell was clicked
    const interval = Math.floor((x - leftMargin) / cellWidth)
    const row = Math.floor((y - topMargin) / rowHeight)

    // Check if click is within valid grid area
    if (interval >= 0 && interval < 96 && row >= 0 && row < 4) {
      const dutyKeys = ['OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY']
      const dutyStatus = dutyKeys[row]

      // Find if this interval already has an entry for this duty status
      const existingIdx = entries.findIndex(
        e => e.interval === interval && e.duty_status === dutyStatus
      )
      
      if (existingIdx >= 0) {
        // Remove if already marked
        setEntries(entries.filter((_, idx) => idx !== existingIdx))
      } else {
        // Remove any existing entry for this interval (any duty status)
        const newEntries = entries.filter(e => e.interval !== interval)
        // Add new entry for this interval and duty status
        newEntries.push({
          interval: interval,
          duty_status: dutyStatus
        })
        setEntries(newEntries)
      }
    }
  }

  const handleExportPDF = async () => {
    if (!logSheetRef.current) return
    
    setIsExporting(true)
    
    try {
      // Capture the entire log sheet including all form fields
      const canvas = await html2canvas(logSheetRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      })
      
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `drivers_daily_log_${date}_day_${dayNumber}.png`
      link.click()
    } catch (error) {
      console.error('Error exporting log:', error)
      alert('Failed to export log sheet. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="eld-log-sheet-wrapper">
      <div className="eld-log-sheet" ref={logSheetRef}>
        <div className="sheet-header">
          <div className="header-title">
            <h3>Driver's Daily Log</h3>
            <div className="date-fields">
              <span><strong>24 hours - period for 24 consecutive hours</strong></span>
            </div>
          </div>
        </div>

      <div className="driver-info-section">
        <div className="info-row">
          <div className="info-field" style={{ maxWidth: '150px' }}>
            <label>Date (month):</label>
            <input type="text" placeholder="MM" />
          </div>
          <div className="info-field" style={{ maxWidth: '150px' }}>
            <label>Date (day):</label>
            <input type="text" placeholder="DD" />
          </div>
          <div className="info-field" style={{ maxWidth: '150px' }}>
            <label>Date (year):</label>
            <input type="text" placeholder="YYYY" />
          </div>
          <div className="info-field">
            <label>Original - File at home terminal:</label>
            <input type="text" placeholder="Location" />
          </div>
          <div className="info-field">
            <label>Duplicate - Driver retains for 8 days:</label>
            <input type="text" placeholder="Driver copy" />
          </div>
        </div>
        <div className="info-row">
          <div className="info-field">
            <label>From:</label>
            <input type="text" placeholder="Starting location" />
          </div>
          <div className="info-field">
            <label>To:</label>
            <input type="text" placeholder="Ending location" />
          </div>
        </div>
        <div className="info-row">
          <div className="info-field">
            <label>Total Miles Driving Today:</label>
            <input type="number" placeholder="0" />
          </div>
          <div className="info-field">
            <label>Total Mileage Today:</label>
            <input type="number" placeholder="0" />
          </div>
          <div className="info-field">
            <label>Name of Carrier or Carriers:</label>
            <input type="text" placeholder="Carrier name" />
          </div>
        </div>
        <div className="info-row">
          <div className="info-field">
            <label>Main Office Address:</label>
            <input type="text" placeholder="Address" />
          </div>
          <div className="info-field">
            <label>Home Terminal Address:</label>
            <input type="text" placeholder="Address" />
          </div>
        </div>
        <div className="info-row">
          <div className="info-field">
            <label>Truck/Tractor and Trailer Numbers or License Plate(s) (state and unit):</label>
            <input type="text" placeholder="Vehicle info" />
          </div>
        </div>
      </div>

      <div className="sheet-content">
        <p className="instruction">
          Click on cells to mark each 15-minute period with the corresponding duty status. Click again to remove.
        </p>
        <canvas
          ref={canvasRef}
          width={1200}
          height={280}
          onClick={handleCanvasClick}
          className="log-canvas"
        />
      </div>

      <div className="sheet-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#999' }}></div>
          <span>1. Off Duty</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4caf50' }}></div>
          <span>2. Sleeper Berth</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ff6b6b' }}></div>
          <span>3. Driving</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ffa500' }}></div>
          <span>4. On Duty (Not Driving)</span>
        </div>
      </div>

      <div className="remarks-section">
        <h4>Remarks</h4>
        <p className="remarks-instruction">
          Record location (City, State) and activity for each duty status change
        </p>
        <textarea
          rows="4"
          placeholder="Example:&#10;- 06:30 Green Bay, WI - Pre-trip inspection&#10;- 07:00 Green Bay, WI - Started driving&#10;- 13:00 Paw Paw, IL - 30-minute break&#10;- 17:30 Edwardsville, IL - Post-trip, End of day"
          className="remarks-textarea"
        />
      </div>

      <div className="shipping-section">
        <h4>Shipping Documents</h4>
        <div className="shipping-fields">
          <div className="info-field">
            <label>Bill of Manifest No.:</label>
            <input type="text" placeholder="Document number" />
          </div>
          <div className="info-field">
            <label>Shipper & Commodity:</label>
            <input type="text" placeholder="Shipper name & cargo type" />
          </div>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', fontWeight: '700', color: '#000' }}>
          Enter name of place and when released from work and when each change of duty occurred.
        </p>
      </div>

      <div className="totals-section">
        <h4 style={{ margin: '0 0 12px 0', color: '#000', fontSize: '1em', fontWeight: '800', textTransform: 'uppercase' }}>
          Recap
        </h4>
        <div className="totals-grid">
          <div className="total-item">
            <label>Total Off Duty Hours:</label>
            <strong>{log.off_duty_hours.toFixed(1)}</strong>
          </div>
          <div className="total-item">
            <label>Total Sleeper Berth Hours:</label>
            <strong>{log.sleeper_berth_hours.toFixed(1)}</strong>
          </div>
          <div className="total-item">
            <label>Total Driving Hours:</label>
            <strong>{log.driving_hours.toFixed(1)}</strong>
          </div>
          <div className="total-item">
            <label>Total On-Duty Hours:</label>
            <strong>{log.on_duty_hours.toFixed(1)}</strong>
          </div>
        </div>
        <div className="daily-totals">
          <div className="total-highlight">
            <label>Total Hours (Must = 24):</label>
            <strong className="total-24">
              {(log.off_duty_hours + log.sleeper_berth_hours + log.driving_hours + log.on_duty_hours).toFixed(1)}
            </strong>
          </div>
          <div className="total-highlight">
            <label>Total Driving + On-Duty:</label>
            <strong className="total-duty">
              {(log.driving_hours + log.on_duty_hours).toFixed(1)}
            </strong>
          </div>
        </div>
        <p style={{ margin: '12px 0 0 0', fontSize: '0.85em', fontWeight: '700', color: '#000' }}>
          70 Hours / 8 Days - 60 Hours / 7 Days
        </p>
      </div>

        <div className="signature-section">
          <div className="signature-field">
            <label>Driver Signature / Certification:</label>
            <div className="signature-line"></div>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', fontWeight: '600', color: '#000' }}>
            I certify that my record of duty status for this date is true and correct.
          </p>
        </div>
      </div>
      
      <div className="export-section">
        <button 
          onClick={handleExportPDF} 
          className="export-btn"
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : '📄 Export Completed Log Sheet'}
        </button>
        <p className="export-note">
          Click to export the entire log sheet with all filled fields as an image
        </p>
      </div>
    </div>
  )
}

export default ELDLogSheet
