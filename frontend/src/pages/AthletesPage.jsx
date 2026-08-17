import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAthletes } from '../api/athletes.js';
import AthleteList from '../components/AthleteList.jsx';

export default function AthletesPage() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadAthletes() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAthletes(includeInactive);
        if (mounted) {
          setAthletes(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAthletes();

    return () => {
      mounted = false;
    };
  }, [includeInactive, retryCount]);

  return (
    <div className="athletes-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Athletes</h1>
        <Link to="/athletes/new" className="btn-primary" style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'white', textDecoration: 'none', borderRadius: 'var(--radius)' }}>+ Add Athlete</Link>
      </div>
      
      <div className="athletes-toolbar" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
          <input 
            type="checkbox" 
            checked={includeInactive} 
            onChange={(e) => setIncludeInactive(e.target.checked)} 
          />
          Show inactive athletes
        </label>
      </div>

      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading athletes...
        </div>
      )}

      {error && !loading && (
        <div role="alert" style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>Error:</strong> {error}</span>
          <button 
            onClick={() => setRetryCount(c => c + 1)}
            style={{ padding: '0.25rem 0.75rem', background: '#991b1b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <AthleteList athletes={athletes} />
      )}
    </div>
  );
}
