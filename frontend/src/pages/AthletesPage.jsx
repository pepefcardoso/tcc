import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAthletes, inactivateAthlete } from '../api/athletes.js';
import AthleteList from '../components/AthleteList.jsx';
import AthleteEditModal from '../components/AthleteEditModal.jsx';

export default function AthletesPage() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [editingAthlete, setEditingAthlete] = useState(null);

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

  const handleEdit = (athlete) => {
    setEditingAthlete(athlete);
  };

  const handleEditClose = () => {
    setEditingAthlete(null);
  };

  const handleEditSaved = (updatedAthlete) => {
    setAthletes((prev) =>
      prev.map((a) => {
        const idA = a.id || a.athlete_id;
        const idU = updatedAthlete.id || updatedAthlete.athlete_id;
        return idA === idU ? updatedAthlete : a;
      })
    );
    setEditingAthlete(null);
  };

  const handleInactivate = async (id) => {
    if (!window.confirm('Are you sure you want to inactivate this athlete?')) {
      return;
    }
    
    try {
      await inactivateAthlete(id);
      
      setAthletes((prev) => {
        if (!includeInactive) {
          return prev.filter((a) => (a.id || a.athlete_id) !== id);
        }
        return prev.map((a) => {
          const idA = a.id || a.athlete_id;
          return idA === id ? { ...a, active: false } : a;
        });
      });
    } catch (err) {
      setError(err.message || 'Failed to inactivate athlete');
    }
  };

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
        <AthleteList 
          athletes={athletes} 
          onEdit={handleEdit} 
          onInactivate={handleInactivate} 
        />
      )}

      <AthleteEditModal 
        athlete={editingAthlete} 
        onClose={handleEditClose} 
        onSaved={handleEditSaved} 
      />
    </div>
  );
}
