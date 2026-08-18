import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSessionsByAthlete } from '../api/sessions.js';
import { fetchAthleteAcwr } from '../api/athletes.js';
import AcwrBadge from '../components/AcwrBadge.jsx';
import WeeklyLoadChart from '../components/WeeklyLoadChart.jsx';

export default function AthleteDetailPage() {
  const { id } = useParams();
  const [sessions, setSessions] = useState([]);
  const [acwrData, setAcwrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [sessionsRes, acwrRes] = await Promise.all([
          fetchSessionsByAthlete(id),
          fetchAthleteAcwr(id).catch(err => {
            console.warn('Could not load ACWR:', err);
            return null;
          })
        ]);
        
        if (mounted) {
          setSessions(sessionsRes);
          setAcwrData(acwrRes);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load athlete data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="athlete-detail-page">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/athletes" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
          &larr; Back to Athletes
        </Link>
      </div>

      {loading && <div style={{ color: 'var(--color-text-muted)' }}>Loading athlete history...</div>}
      
      {error && !loading && (
        <div role="alert" style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 'var(--radius)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0' }}>Athlete Details</h1>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>ID: {id}</p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                Current ACWR
              </p>
              {acwrData ? (
                <AcwrBadge value={acwrData.acwr} zone={acwrData.zone} size="md" />
              ) : (
                <AcwrBadge value={null} zone={null} size="md" />
              )}
            </div>
          </div>

          <section aria-labelledby="history-heading" style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 id="history-heading" style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: 'var(--text-lg)' }}>
              Weekly Load & ACWR History
            </h2>
            <WeeklyLoadChart sessions={sessions} />
          </section>
        </>
      )}
    </div>
  );
}
