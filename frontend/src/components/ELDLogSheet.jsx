import { useRef, useEffect, useState } from 'react'
import html2canvas from 'html2canvas'
import './ELDLogSheet.css'

function ELDLogSheet({ log, date, dayNumber, totalDays }) {
  const canvasRef = useRef(null)
  const logSheetRef = useRef(null)
  const [entries, setEntries] = useState([])
  const [remarks, setRemarks] = useState([])
  const [isExporting, setIsExporting] = useState(false)

  // Initialize entries from log data
  useEffect(() => {
    const initialEntries = []
    
    // Create 24-hour entries based on duty hours
    let hoursRemaining = {
      OFF: log.off_duty_hours,
      SLEEPER: log.sleeper_berth_hours,
      DRIVING: log.driving_hours,
      ON_DUTY: log.on_duty_hours
    }

    // Simple distribution: driving hours first, then on_duty, then sleeper, then off
    const dutyOrder = ['DRIVING', 'ON_DUTY', 'SLEEPER', 'OFF']
    let currentHour = 0

    for (let dutyType of dutyOrder) {
      while (hoursRemaining[dutyType] > 0 && currentHour < 24) {
        initialEntries.push({
          hour: currentHour,
          minute: 0,
          duty_status: dutyType
        })
        hoursRemaining[dutyType] -= 1
        currentHour += 1
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
    const leftMargin = 10
    const hourWidth = (width - leftMargin) / 24
    const rowHeight = (height - 30) / 4 // 4 duty status rows

    // Draw time header (midnight to midnight)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    
    // Draw hour markers
    for (let h = 0; h <= 24; h++) {
      const x = leftMargin + h * hourWidth
      const displayHour = h === 24 ? 'Midnight' : h.toString()
      ctx.fillText(displayHour, x, 15)
      
      // Draw vertical lines for hours
      ctx.strokeStyle = '#000'
      ctx.lineWidth = h % 12 === 0 ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(x, 20)
      ctx.lineTo(x, 20 + rowHeight * 4)
      ctx.stroke()
      
      // Draw 15-minute increment lines
      if (h < 24) {
        for (let q = 1; q < 4; q++) {
          const qx = x + (hourWidth / 4) * q
          ctx.strokeStyle = '#ccc'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(qx, 20)
          ctx.lineTo(qx, 20 + rowHeight * 4)
          ctx.stroke()
        }
      }
    }

    // Draw duty status rows
    const dutyStatuses = ['1. Off Duty', '2. Sleeper', '3. Driving', '4. On Duty']
    const dutyKeys = ['OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY']
    const colors = {
      OFF: '#999',
      SLEEPER: '#4caf50',
      DRIVING: '#ff6b6b',
      ON_DUTY: '#ffa500'
    }

    for (let row = 0; row < dutyStatuses.length; row++) {
      const y = 20 + row * rowHeight
      
      // Draw horizontal line
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(leftMargin, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      
      // Draw row label on left side of canvas
      ctx.fillStyle = '#000'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(dutyStatuses[row], 2, y + 12)
      
      // Fill in duty status for each hour
      for (let h = 0; h < 24; h++) {
        const matchingEntry = entries.find(
          e => e.hour === h && e.duty_status === dutyKeys[row]
        )
        
        if (matchingEntry) {
          ctx.fillStyle = colors[dutyKeys[row]]
          const x = leftMargin + h * hourWidth
          ctx.fillRect(x + 1, y + 1, hourWidth - 2, rowHeight - 2)
        }
      }
    }

    // Draw bottom border
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(leftMargin, 20, width - leftMargin, rowHeight * 4)

  }, [entries])

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const width = canvas.width
    const height = canvas.height
    const leftMargin = 10
    const hourWidth = (width - leftMargin) / 24
    const rowHeight = (height - 30) / 4

    const hour = Math.floor((x - leftMargin) / hourWidth)
    const row = Math.floor((y - 20) / rowHeight)

    if (hour >= 0 && hour < 24 && row >= 0 && row < 4) {
      const dutyKeys = ['OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY']
      const dutyStatus = dutyKeys[row]

      // Toggle or set the hour
      const existingIdx = entries.findIndex(
        e => e.hour === hour && e.duty_status === dutyStatus
      )
      
      if (existingIdx >= 0) {
        // Remove if already set
        setEntries(entries.filter((_, idx) => idx !== existingIdx))
      } else {
        // Remove any existing entry for this hour
        const newEntries = entries.filter(e => e.hour !== hour)
        newEntries.push({
          hour: hour,
          minute: 0,
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
          Click on the grid to mark duty status changes (each vertical line = 15 min)
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
