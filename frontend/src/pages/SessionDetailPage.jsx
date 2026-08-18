import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSession, fetchSessionSamples } from '../api/sessions.js';
import VelocityChart from '../components/VelocityChart.jsx';
import RouteMap from '../components/RouteMap.jsx';
import PlayerLoadChart from '../components/PlayerLoadChart.jsx';
import PseForm from '../components/PseForm.jsx';
import './SessionDetailPage.css';

export default function SessionDetailPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [sessionLoad, setSessionLoad] = useState(null);
  const [gps, setGps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handlePseSuccess = (result) => {
    setSessionLoad(result.session_load);
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [sessionData, samplesData] = await Promise.all([
          fetchSession(id),
          fetchSessionSamples(id, 10),
        ]);
        if (mounted) {
          setSession(sessionData);
          setSessionLoad(sessionData.session_load ?? null);
          setGps(samplesData.gps ?? []);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load session');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="session-detail-loading">Loading session...</div>;
  if (error)
    return (
      <div className="session-detail-error" role="alert">
        Error: {error}
      </div>
    );

  const m = session?.metrics;

  return (
    <div className="session-detail">
      <Link to="/sessions" className="session-detail__back">
        ← Back to Sessions
      </Link>
      <h1 className="session-detail__title">Session Detail</h1>

      <div className="session-detail__metrics">
        <MetricCard
          label="Distance"
          value={m?.total_distance_m != null ? `${m.total_distance_m} m` : '—'}
        />
        <MetricCard
          label="Max Speed"
          value={m?.max_speed_kmh != null ? `${m.max_speed_kmh} km/h` : '—'}
        />
        <MetricCard label="Sprints" value={m?.sprint_count ?? '—'} />
        <MetricCard
          label="Player Load"
          value={m?.player_load != null ? m.player_load.toFixed(1) : '—'}
        />
        <MetricCard
          label="Battery Start"
          value={session?.battery_pct_start != null ? `${session.battery_pct_start}%` : 'N/A'}
        />
        <MetricCard
          label="Battery End"
          value={session?.battery_pct_end != null ? `${session.battery_pct_end}%` : 'N/A'}
        />
      </div>

      <section aria-labelledby="pse-heading" className="session-detail__section">
        <h2 id="pse-heading">Perceived Exertion (PSE)</h2>
        <div className="session-detail__metrics">
          <MetricCard
            label="Session Load"
            value={sessionLoad != null ? sessionLoad.toFixed(1) : '—'}
          />
        </div>
        <PseForm sessionId={id} initialPse={session?.pse ?? null} onSuccess={handlePseSuccess} />
      </section>

      <section aria-labelledby="map-heading" className="session-detail__section">
        <h2 id="map-heading">Route Map</h2>
        <RouteMap gps={gps} />
      </section>

      <section aria-labelledby="velocity-heading" className="session-detail__section">
        <h2 id="velocity-heading">Speed Over Time</h2>
        <VelocityChart gps={gps} />
      </section>

      <section aria-labelledby="player-load-heading" className="session-detail__section">
        <h2 id="player-load-heading">Player Load Accumulation</h2>
        <PlayerLoadChart gps={gps} totalPlayerLoad={m?.player_load ?? null} />
      </section>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value">{value}</span>
    </div>
  );
}
