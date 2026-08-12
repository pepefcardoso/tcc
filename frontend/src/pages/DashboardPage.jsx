import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [data, setData] = useState({ athletes: [], high_risk_athlete_ids: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to load dashboard');
        }
        
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboard();
  }, []);

  if (loading) return <div style={{ padding: '1rem' }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: '1rem', color: 'red' }}>Error: {error}</div>;

  const { athletes, high_risk_athlete_ids } = data;
  const highRiskAthletes = athletes.filter(a => high_risk_athlete_ids.includes(a.athlete_id));

  return (
    <div className="dashboard-container" style={{ padding: '1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Team Dashboard</h1>
      
      {highRiskAthletes.length > 0 && (
        <div className="alert-banner" style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px' }}>
          <strong>⚠️ High Risk Alert (ACWR &gt; 1.50):</strong> {highRiskAthletes.map(a => a.name).join(', ')}
        </div>
      )}

      {athletes.length === 0 ? (
        <p>No active athletes.</p>
      ) : (
        <div className="athlete-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {athletes.map(athlete => (
            <div key={athlete.athlete_id} className="athlete-card" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', background: '#fff' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>{athlete.name}</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>ACWR: </strong> 
                <span style={{
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontWeight: '500',
                  backgroundColor: athlete.acwr.zone === 'blue' ? '#bfdbfe' :
                                   athlete.acwr.zone === 'green' ? '#bbf7d0' :
                                   athlete.acwr.zone === 'yellow' ? '#fef08a' :
                                   athlete.acwr.zone === 'red' ? '#fecaca' : '#f3f4f6',
                  color: athlete.acwr.zone === 'blue' ? '#1e3a8a' :
                         athlete.acwr.zone === 'green' ? '#166534' :
                         athlete.acwr.zone === 'yellow' ? '#854d0e' :
                         athlete.acwr.zone === 'red' ? '#991b1b' : '#374151'
                }}>
                  {athlete.acwr.value !== null ? athlete.acwr.value.toFixed(2) : 'N/A'}
                </span>
              </div>

              {athlete.latest_session ? (
                <div style={{ fontSize: '0.9rem', color: '#4b5563', background: '#f9fafb', padding: '0.75rem', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: '#111827' }}>
                    Latest: {new Date(athlete.latest_session.date).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '0.25rem 0' }}>Distance: {athlete.latest_session.total_distance_m ?? 0}m</p>
                  <p style={{ margin: '0.25rem 0' }}>Max Speed: {athlete.latest_session.max_speed_kmh ?? 0}km/h</p>
                  <p style={{ margin: '0.25rem 0' }}>Sprints: {athlete.latest_session.sprint_count ?? 0}</p>
                  <p style={{ margin: '0.25rem 0' }}>Player Load: {athlete.latest_session.player_load ?? 0}</p>
                  
                  {athlete.latest_session.pse_pending && (
                    <div style={{ marginTop: '0.75rem', display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500' }}>
                      PSE Pending
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>No sessions yet</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
