import React, { useRef, useEffect } from 'react';
import './LogSheets.css';

const LogSheets = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <div className="log-sheets-container">
      <h2>ELD Daily Log Sheets</h2>
      <div className="logs-grid">
        {logs.map((log, index) => (
          <LogSheet key={index} log={log} dayNumber={index + 1} />
        ))}
      </div>
    </div>
  );
};

const LogSheet = ({ log, dayNumber }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set up styles
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';

    // Draw log sheet structure
    drawLogSheet(ctx, width, height, log);
  }, [log]);

  return (
    <div className="log-sheet-wrapper">
      <div className="log-sheet-header">
        <h3>Day {dayNumber} - {new Date(log.date).toLocaleDateString()}</h3>
      </div>
      <canvas
        ref={canvasRef}
        width={1000}
        height={1400}
        className="log-sheet-canvas"
      />
      <div className="log-sheet-summary">
        <div className="summary-item">
          <strong>Driving Hours:</strong> {log.recap.driving_hours.toFixed(2)} hrs
        </div>
        <div className="summary-item">
          <strong>On Duty Hours:</strong> {log.recap.on_duty_hours.toFixed(2)} hrs
        </div>
        <div className="summary-item">
          <strong>Off Duty Hours:</strong> {log.recap.off_duty_hours.toFixed(2)} hrs
        </div>
        <div className="summary-item">
          <strong>Total Miles:</strong> {log.total_miles_driving.toFixed(2)} miles
        </div>
      </div>
    </div>
  );
};

const drawLogSheet = (ctx, width, height, log) => {
  const margin = 40;
  const headerHeight = 120;
  const timelineHeight = 300;
  const timelineY = 250;
  const timelineWidth = width - 2 * margin - 200;
  const timelineX = margin + 200;

  // Draw header
  ctx.fillStyle = '#000';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('Drivers Daily Log (24 hours)', margin, 30);
  
  ctx.font = '12px Arial';
  const date = new Date(log.date);
  ctx.fillText(`Date: ${date.toLocaleDateString()}`, width - 200, 30);
  
  // Draw origin/destination
  ctx.fillText(`From: ${log.origin}`, margin, 60);
  ctx.fillText(`To: ${log.destination}`, margin, 80);
  ctx.fillText(`Total Miles: ${log.total_miles_driving.toFixed(2)}`, margin, 100);

  // Draw duty status labels
  const statusLabels = [
    '1. Off Duty',
    '2. Sleeper Berth',
    '3. Driving',
    '4. On Duty (not driving)'
  ];
  
  const statusYStart = timelineY + 20;
  const statusRowHeight = 50;
  
  statusLabels.forEach((label, index) => {
    const y = statusYStart + index * statusRowHeight;
    ctx.fillText(label, margin + 20, y + 15);
  });

  // Draw timeline grid
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  
  // Draw horizontal lines for each status
  for (let i = 0; i <= 4; i++) {
    const y = statusYStart + i * statusRowHeight - 10;
    ctx.beginPath();
    ctx.moveTo(timelineX, y);
    ctx.lineTo(timelineX + timelineWidth, y);
    ctx.stroke();
  }

  // Draw time markers (24 hours, every hour)
  ctx.font = '10px Arial';
  ctx.fillStyle = '#333';
  for (let hour = 0; hour <= 24; hour++) {
    const x = timelineX + (hour / 24) * timelineWidth;
    ctx.beginPath();
    ctx.moveTo(x, statusYStart - 10);
    ctx.lineTo(x, statusYStart + 4 * statusRowHeight - 10);
    ctx.stroke();
    
    if (hour % 2 === 0) {
      const hourLabel = hour === 0 ? 'Mid' : hour === 12 ? 'Noon' : hour > 12 ? `${hour - 12}` : `${hour}`;
      ctx.fillText(hourLabel, x - 10, statusYStart - 15);
    }
  }

  // Draw duty status timeline
  drawDutyStatusTimeline(ctx, log, timelineX, statusYStart, timelineWidth, statusRowHeight);

  // Draw recap section
  const recapY = timelineY + timelineHeight + 50;
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Recap: Complete at end of day', margin, recapY);
  
  ctx.font = '12px Arial';
  ctx.fillText(`On duty hours today: ${log.recap.on_duty_hours.toFixed(2)}`, margin, recapY + 30);
  ctx.fillText(`Driving hours: ${log.recap.driving_hours.toFixed(2)}`, margin, recapY + 50);
  ctx.fillText(`Off duty hours: ${log.recap.off_duty_hours.toFixed(2)}`, margin, recapY + 70);
  ctx.fillText(`Total 70hr/8day: ${log.recap.total_70hr_8day.toFixed(2)}`, margin, recapY + 90);
  ctx.fillText(`Available tomorrow: ${log.recap.available_tomorrow.toFixed(2)} hrs`, margin, recapY + 110);
};

const drawDutyStatusTimeline = (ctx, log, x, yStart, width, rowHeight) => {
  const activities = log.activities || [];
  
  activities.forEach(activity => {
    const startTime = parseTime(activity.start);
    const endTime = parseTime(activity.end);
    
    const startX = x + (startTime / 24) * width;
    const endX = x + (endTime / 24) * width;
    
    let rowIndex = 0; // Default to Off Duty
    if (activity.type === 'driving') {
      rowIndex = 2; // Driving
    } else if (activity.type === 'on_duty') {
      rowIndex = 3; // On Duty (not driving)
    }
    
    const y = yStart + rowIndex * rowHeight - 10;
    const barHeight = rowHeight - 2;
    
    // Draw activity bar
    ctx.fillStyle = activity.type === 'driving' ? '#e74c3c' : 
                   activity.type === 'on_duty' ? '#f39c12' : '#3498db';
    ctx.fillRect(startX, y, endX - startX, barHeight);
    
    // Draw border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, y, endX - startX, barHeight);
  });
};

const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

export default LogSheets;

