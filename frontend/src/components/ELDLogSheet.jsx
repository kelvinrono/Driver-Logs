import { useRef, useEffect, useState } from 'react'
import './ELDLogSheet.css'

function ELDLogSheet({ log, date, dayNumber, totalDays }) {
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [entries, setEntries] = useState([])

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

    // Draw grid
    const hourWidth = width / 24
    const rowHeight = height / 5 // 4 duty statuses + header

    // Draw hours header
    ctx.fillStyle = '#000'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    for (let h = 0; h < 24; h++) {
      const x = h * hourWidth + hourWidth / 2
      ctx.fillText(h.toString().padStart(2, '0'), x, 15)
    }

    // Draw grid lines and duty status rows
    const dutyStatuses = ['OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY']
    const colors = {
      OFF: '#e0e0e0',
      SLEEPER: '#b3d9ff',
      DRIVING: '#ffb3b3',
      ON_DUTY: '#ffffcc'
    }

    for (let row = 0; row < dutyStatuses.length; row++) {
      const y = 20 + row * rowHeight
      
      // Draw label
      ctx.fillStyle = '#000'
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(dutyStatuses[row], 80, y + rowHeight / 2 + 4)
      
      // Draw cells
      for (let h = 0; h < 24; h++) {
        const x = 90 + h * hourWidth
        
        // Check if this hour should be filled for this duty status
        const matchingEntry = entries.find(
          e => e.hour === h && e.duty_status === dutyStatuses[row]
        )
        
        if (matchingEntry) {
          ctx.fillStyle = colors[dutyStatuses[row]]
          ctx.fillRect(x, y, hourWidth, rowHeight)
        }
        
        // Draw grid lines
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, hourWidth, rowHeight)
      }
    }

    // Draw outer border
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(90, 20, width - 100, dutyStatuses.length * rowHeight)
  }, [entries])

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const width = canvas.width
    const height = canvas.height
    const hourWidth = (width - 100) / 24
    const rowHeight = height / 5

    const hour = Math.floor((x - 90) / hourWidth)
    const row = Math.floor((y - 20) / rowHeight)

    if (hour >= 0 && hour < 24 && row >= 0 && row < 4) {
      const dutyOrder = ['OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY']
      const dutyStatus = dutyOrder[row]

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
    // Simple export as canvas image
    if (canvasRef.current) {
      const image = canvasRef.current.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `log_${date}_day_${dayNumber}.png`
      link.click()
    }
  }

  return (
    <div className="eld-log-sheet">
      <div className="sheet-header">
        <h3>ELD Daily Log - Day {dayNumber} of {totalDays}</h3>
        <p>Date: {date}</p>
        <button onClick={handleExportPDF} className="export-btn">Export as Image</button>
      </div>

      <div className="sheet-content">
        <p className="instruction">Click on grid cells to set duty status (Demo Mode)</p>
        <canvas
          ref={canvasRef}
          width={1000}
          height={200}
          onClick={handleCanvasClick}
          className="log-canvas"
        />
      </div>

      <div className="sheet-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#e0e0e0' }}></div>
          <span>Off Duty</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#b3d9ff' }}></div>
          <span>Sleeper Berth</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ffb3b3' }}></div>
          <span>Driving</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ffffcc' }}></div>
          <span>On Duty</span>
        </div>
      </div>

      <div className="sheet-remarks">
        <h4>Remarks</h4>
        <p>Day {dayNumber}: Trip continuation. Hours per duty status are automatically calculated from route planning.</p>
      </div>
    </div>
  )
}

export default ELDLogSheet
