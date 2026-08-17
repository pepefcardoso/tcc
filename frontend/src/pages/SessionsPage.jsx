import { useState, useEffect } from 'react';
import { fetchAthletes } from '../api/athletes.js';
import { fetchSessionsByAthlete } from '../api/sessions.js';
import SessionList from '../components/SessionList.jsx';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let mounted = true;

    async function loadSessions() {
      try {
        setLoading(true);
        setError(null);

        const athletes = await fetchAthletes(false);

        const sessionPromises = athletes.map(async (athlete) => {
          const athleteSessions = await fetchSessionsByAthlete(athlete.id || athlete.athlete_id);
          return athleteSessions.map((session) => ({
            ...session,
            athleteName: athlete.name,
          }));
        });

        const sessionsArrays = await Promise.all(sessionPromises);

        const allSessions = sessionsArrays.flat();

        allSessions.sort((a, b) => {
          const dateA = a.started_at ? new Date(a.started_at).getTime() : 0;
          const dateB = b.started_at ? new Date(b.started_at).getTime() : 0;
          return dateB - dateA;
        });

        if (mounted) {
          setSessions(allSessions);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load sessions');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSessions();

    return () => {
      mounted = false;
    };
  }, [retryCount]);

  const handleSort = (field) => {
    if (field === 'date') {
      const newDir = sortDir === 'desc' ? 'asc' : 'desc';
      setSortDir(newDir);

      const sorted = [...sessions].sort((a, b) => {
        const dateA = a.started_at ? new Date(a.started_at).getTime() : 0;
        const dateB = b.started_at ? new Date(b.started_at).getTime() : 0;
        return newDir === 'desc' ? dateB - dateA : dateA - dateB;
      });

      setSessions(sorted);
    }
  };

  return (
    <div className="sessions-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ margin: 0 }}>Sessions</h1>
      </div>

      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading sessions...
        </div>
      )}

      {error && !loading && (
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: 'var(--radius)',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            <strong>Error:</strong> {error}
          </span>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            style={{
              padding: '0.25rem 0.75rem',
              background: '#991b1b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <SessionList sessions={sessions} sortDir={sortDir} onSort={handleSort} />
      )}
    </div>
  );
}
