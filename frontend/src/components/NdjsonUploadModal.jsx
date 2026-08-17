import { useState, useEffect, useRef } from 'react';
import { fetchAthletes } from '../api/athletes.js';
import { uploadSession } from '../api/sessions.js';
import './NdjsonUploadModal.css';

export default function NdjsonUploadModal({ open, onClose, onSuccess }) {
  const [athletes, setAthletes] = useState([]);
  const [athletesLoading, setAthletesLoading] = useState(true);
  const [athletesError, setAthletesError] = useState(null);
  
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [file, setFile] = useState(null);
  
  const [athleteError, setAthleteError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const selectRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    if (open) {
      setAthletesLoading(true);
      setAthletesError(null);
      setSelectedAthleteId('');
      setFile(null);
      setAthleteError(null);
      setFileError(null);
      setUploadError(null);
      setUploading(false);
      setResult(null);

      fetchAthletes(false)
        .then((data) => {
          if (mounted) {
            setAthletes(data);
            setAthletesLoading(false);
          }
        })
        .catch((err) => {
          if (mounted) {
            setAthletesError(err.message || 'Failed to load athletes');
            setAthletesLoading(false);
          }
        });
        
      if (selectRef.current) {
        setTimeout(() => {
          if (selectRef.current) selectRef.current.focus();
        }, 0);
      }
    }

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open && !uploading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, uploading, onClose]);

  if (!open) return null;

  const validate = () => {
    let isValid = true;
    setAthleteError(null);
    setFileError(null);

    if (!selectedAthleteId) {
      setAthleteError('Please select an athlete');
      isValid = false;
    }

    if (!file) {
      setFileError('Please choose an NDJSON file');
      isValid = false;
    } else if (!file.name.toLowerCase().endsWith('.ndjson')) {
      setFileError('File must have a .ndjson extension');
      isValid = false;
    } else if (file.size > 100 * 1024 * 1024) {
      setFileError('File exceeds 100 MB maximum');
      isValid = false;
    }

    return isValid;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
    setFileError(null);
    setUploadError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setUploading(true);
    setUploadError(null);
    setResult(null);

    try {
      const response = await uploadSession(selectedAthleteId, file);
      setResult(response);
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      setUploadError(err.message || 'An unexpected error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !uploading && onClose()} role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
      <div className="modal-content upload-modal-container" onClick={(e) => e.stopPropagation()}>
        <h2 id="upload-modal-title">Upload NDJSON Session</h2>

        {result ? (
          <div className="upload-result-view">
            {result.status === 'processed' ? (
              <div className="upload-result-banner upload-result-banner--success" role="alert">
                Session uploaded and processed successfully.
              </div>
            ) : (
              <div className="upload-result-banner upload-result-banner--warning" role="alert">
                This file was already processed. Prior metrics are shown below.
              </div>
            )}

            {result.metrics && (
              <table className="metrics-table">
                <tbody>
                  <tr>
                    <th>Total Distance</th>
                    <td>{result.metrics.total_distance_m != null ? `${result.metrics.total_distance_m} m` : '—'}</td>
                  </tr>
                  <tr>
                    <th>Max Speed</th>
                    <td>{result.metrics.max_speed_kmh != null ? `${result.metrics.max_speed_kmh} km/h` : '—'}</td>
                  </tr>
                  <tr>
                    <th>Sprint Count</th>
                    <td>{result.metrics.sprint_count != null ? result.metrics.sprint_count : '—'}</td>
                  </tr>
                  <tr>
                    <th>Player Load</th>
                    <td>{result.metrics.player_load != null ? result.metrics.player_load : '—'}</td>
                  </tr>
                </tbody>
              </table>
            )}

            <div className="result-actions">
              <button type="button" className="upload-btn" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            {uploadError && (
              <div className="global-error" role="alert">
                <span><strong>Error:</strong> {uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="athlete-select">Athlete *</label>
                {athletesLoading ? (
                  <div style={{ color: 'var(--color-text-muted)' }}>Loading athletes...</div>
                ) : athletesError ? (
                  <div style={{ color: 'var(--color-danger)' }}>{athletesError}</div>
                ) : (
                  <select
                    id="athlete-select"
                    ref={selectRef}
                    value={selectedAthleteId}
                    onChange={(e) => {
                      setSelectedAthleteId(e.target.value);
                      setAthleteError(null);
                      setUploadError(null);
                    }}
                    aria-invalid={!!athleteError}
                    aria-describedby={athleteError ? 'athlete-error' : undefined}
                  >
                    <option value="" disabled>Select an athlete</option>
                    {athletes.map((a) => (
                      <option key={a.id || a.athlete_id} value={a.id || a.athlete_id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
                {athleteError && <span id="athlete-error" className="form-error">{athleteError}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="file-input">Session File (.ndjson) *</label>
                <input
                  type="file"
                  id="file-input"
                  className="file-input"
                  ref={fileInputRef}
                  accept=".ndjson"
                  onChange={handleFileChange}
                  aria-invalid={!!fileError}
                  aria-describedby={fileError ? 'file-error' : undefined}
                />
                {fileError && <span id="file-error" className="form-error">{fileError}</span>}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={onClose} disabled={uploading}>
                  Cancel
                </button>
                <button type="submit" className="upload-btn" disabled={uploading || athletesLoading || !!athletesError}>
                  {uploading && <div className="upload-spinner" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
