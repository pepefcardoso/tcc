import { useState, useEffect } from 'react';
import { patchSessionPse } from '../api/sessions.js';
import './PseForm.css';

const PSE_OPTIONS = [
  { value: 1, label: '1 - Very Light' },
  { value: 2, label: '2 - Light' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - Somewhat Hard' },
  { value: 5, label: '5 - Hard' },
  { value: 6, label: '6 - Harder' },
  { value: 7, label: '7 - Very Hard' },
  { value: 8, label: '8 - Extremely Hard' },
  { value: 9, label: '9 - Maximal' },
  { value: 10, label: '10 - Maximal (Absolute)' },
];

export default function PseForm({ sessionId, initialPse, onSuccess }) {
  const [selectedPse, setSelectedPse] = useState(initialPse ? String(initialPse) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialPse) {
      setSelectedPse(String(initialPse));
    }
  }, [initialPse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parsedPse = parseInt(selectedPse, 10);
    
    if (isNaN(parsedPse) || parsedPse < 1 || parsedPse > 10) {
      setError('PSE must be an integer between 1 and 10');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitted(false);

    try {
      const result = await patchSessionPse(sessionId, parsedPse);
      setSubmitted(true);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err.message ?? 'Failed to save PSE');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="pse-form" onSubmit={handleSubmit} aria-label="Register PSE">
      <label htmlFor="pse-select" className="pse-form__label">
        Borg CR-10 Rating
      </label>
      
      <select
        id="pse-select"
        className="pse-form__select"
        value={selectedPse}
        onChange={(e) => {
          setSelectedPse(e.target.value);
          setError(null);
          setSubmitted(false);
        }}
        disabled={submitting}
      >
        <option value="">— select —</option>
        {PSE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button type="submit" className="pse-form__button" disabled={submitting || !selectedPse}>
        {submitting ? 'Saving...' : 'Save PSE'}
      </button>

      {error && (
        <p className="pse-form__error" role="alert">
          {error}
        </p>
      )}

      {submitted && !error && (
        <p className="pse-form__success" role="status">
          PSE saved successfully!
        </p>
      )}
    </form>
  );
}
