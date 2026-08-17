import { useState, useEffect, useRef } from 'react';
import { updateAthlete } from '../api/athletes.js';
import './AthleteEditModal.css';

export default function AthleteEditModal({ athlete, onClose, onSaved }) {
  const [fields, setFields] = useState({
    name: '',
    position: '',
    birth_date: '',
    weight_kg: '',
    height_m: '',
  });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (athlete) {
      setFields({
        name: athlete.name || '',
        position: athlete.position || '',
        birth_date: athlete.birth_date ? athlete.birth_date.slice(0, 10) : '',
        weight_kg: athlete.weight_kg != null ? String(athlete.weight_kg) : '',
        height_m: athlete.height_m != null ? String(athlete.height_m) : '',
      });
      setErrors({});
      setGlobalError(null);
    }
  }, [athlete]);

  useEffect(() => {
    if (athlete && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [athlete]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && athlete) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [athlete, onClose]);

  if (!athlete) return null;

  const validate = () => {
    const newErrors = {};

    if (!fields.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (fields.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or fewer';
    }

    if (fields.position && fields.position.length > 50) {
      newErrors.position = 'Position must be 50 characters or fewer';
    }

    if (!fields.birth_date) {
      newErrors.birth_date = 'Birth date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.birth_date)) {
      newErrors.birth_date = 'Format must be YYYY-MM-DD';
    } else {
      const date = new Date(fields.birth_date);
      if (isNaN(date.getTime()) || date.getFullYear() < 1900) {
        newErrors.birth_date = 'Must be a valid calendar date';
      }
    }

    if (!fields.weight_kg) {
      newErrors.weight_kg = 'Weight is required';
    } else if (!/^\d+(\.\d{1,2})?$/.test(fields.weight_kg) || parseFloat(fields.weight_kg) <= 0) {
      newErrors.weight_kg = 'Must be a positive number with max 2 decimal places';
    }

    if (!fields.height_m) {
      newErrors.height_m = 'Height is required';
    } else if (!/^\d+(\.\d{1,3})?$/.test(fields.height_m) || parseFloat(fields.height_m) <= 0) {
      newErrors.height_m = 'Must be a positive number with max 3 decimal places';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setGlobalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setGlobalError(null);

    try {
      const payload = {
        name: fields.name.trim(),
        birth_date: fields.birth_date,
        weight_kg: parseFloat(fields.weight_kg),
        height_m: parseFloat(fields.height_m),
      };
      if (fields.position.trim()) {
        payload.position = fields.position.trim();
      }

      const updatedAthlete = await updateAthlete(athlete.id || athlete.athlete_id, payload);
      onSaved(updatedAthlete);
    } catch (err) {
      if (err.status === 422 && err.fields) {
        setErrors(err.fields);
      } else {
        setGlobalError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content athlete-edit-container" onClick={(e) => e.stopPropagation()}>
        <h2 id="modal-title">Edit Athlete</h2>

        {globalError && (
          <div className="global-error" role="alert">
            <span><strong>Error:</strong> {globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="edit-name">Name *</label>
            <input
              type="text"
              id="edit-name"
              name="name"
              ref={firstInputRef}
              value={fields.name}
              onChange={handleChange}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'edit-name-error' : undefined}
            />
            {errors.name && <span id="edit-name-error" className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="edit-position">Position</label>
            <input
              type="text"
              id="edit-position"
              name="position"
              value={fields.position}
              onChange={handleChange}
              aria-invalid={!!errors.position}
              aria-describedby={errors.position ? 'edit-position-error' : undefined}
            />
            {errors.position && <span id="edit-position-error" className="form-error">{errors.position}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="edit-birth_date">Birth Date (YYYY-MM-DD) *</label>
            <input
              type="text"
              id="edit-birth_date"
              name="birth_date"
              value={fields.birth_date}
              onChange={handleChange}
              placeholder="e.g. 1995-10-25"
              aria-invalid={!!errors.birth_date}
              aria-describedby={errors.birth_date ? 'edit-birth_date-error' : undefined}
            />
            {errors.birth_date && <span id="edit-birth_date-error" className="form-error">{errors.birth_date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="edit-weight_kg">Weight (kg) *</label>
            <input
              type="text"
              id="edit-weight_kg"
              name="weight_kg"
              value={fields.weight_kg}
              onChange={handleChange}
              placeholder="e.g. 75.5"
              aria-invalid={!!errors.weight_kg}
              aria-describedby={errors.weight_kg ? 'edit-weight_kg-error' : undefined}
            />
            {errors.weight_kg && <span id="edit-weight_kg-error" className="form-error">{errors.weight_kg}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="edit-height_m">Height (m) *</label>
            <input
              type="text"
              id="edit-height_m"
              name="height_m"
              value={fields.height_m}
              onChange={handleChange}
              placeholder="e.g. 1.82"
              aria-invalid={!!errors.height_m}
              aria-describedby={errors.height_m ? 'edit-height_m-error' : undefined}
            />
            {errors.height_m && <span id="edit-height_m-error" className="form-error">{errors.height_m}</span>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
