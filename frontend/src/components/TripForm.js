import React, { useState } from 'react';
import './TripForm.css';

const TripForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: '0',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      current_cycle_used: parseFloat(formData.current_cycle_used) || 0,
    });
  };

  return (
    <div className="trip-form-container">
      <form onSubmit={handleSubmit} className="trip-form">
        <h2>Enter Trip Details</h2>
        
        <div className="form-group">
          <label htmlFor="current_location">
            Current Location <span className="required">*</span>
          </label>
          <input
            type="text"
            id="current_location"
            name="current_location"
            value={formData.current_location}
            onChange={handleChange}
            placeholder="e.g., New York, NY"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="pickup_location">
            Pickup Location <span className="required">*</span>
          </label>
          <input
            type="text"
            id="pickup_location"
            name="pickup_location"
            value={formData.pickup_location}
            onChange={handleChange}
            placeholder="e.g., Philadelphia, PA"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dropoff_location">
            Dropoff Location <span className="required">*</span>
          </label>
          <input
            type="text"
            id="dropoff_location"
            name="dropoff_location"
            value={formData.dropoff_location}
            onChange={handleChange}
            placeholder="e.g., Chicago, IL"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="current_cycle_used">
            Current Cycle Used (Hours) <span className="required">*</span>
          </label>
          <input
            type="number"
            id="current_cycle_used"
            name="current_cycle_used"
            value={formData.current_cycle_used}
            onChange={handleChange}
            placeholder="0"
            min="0"
            max="70"
            step="0.1"
            required
          />
          <small>Hours used in current 8-day cycle (max 70 hours)</small>
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate Trip & Generate Logs'}
        </button>
      </form>
    </div>
  );
};

export default TripForm;

