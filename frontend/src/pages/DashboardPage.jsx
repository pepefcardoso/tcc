import { useState, useEffect } from 'react';
import { fetchDashboard } from '../api/athletes.js';
import AthleteCard from '../components/AthleteCard.jsx';
import './DashboardPage.css';

export default function DashboardPage() {
  const [data, setData] = useState({ athletes: [], high_risk_athlete_ids: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const result = await fetchDashboard();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }
  
  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  const { athletes, high_risk_athlete_ids } = data;
  const highRiskAthletes = athletes.filter(a => high_risk_athlete_ids.includes(a.athlete_id));

  return (
    <div className="dashboard-page">
      <h1>Team Dashboard</h1>
      
      {highRiskAthletes.length > 0 && (
        <div className="dashboard-alert-banner">
          ⚠️ High Risk Alert (ACWR &gt; 1.50): {highRiskAthletes.map(a => a.name).join(', ')}
        </div>
      )}

      {athletes.length === 0 ? (
        <p className="dashboard-empty">No active athletes.</p>
      ) : (
        <div className="athlete-grid">
          {athletes.map(athlete => (
            <AthleteCard key={athlete.athlete_id} athlete={athlete} />
          ))}
        </div>
      )}
    </div>
  );
}
