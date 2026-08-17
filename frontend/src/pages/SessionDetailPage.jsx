import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSession, fetchSessionSamples } from '../api/sessions.js';
import VelocityChart from '../components/VelocityChart.jsx';
import RouteMap from '../components/RouteMap.jsx';
import './SessionDetailPage.css';

export default function SessionDetailPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [gps, setGps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      {/* Metrics header strip */}
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
      </div>

      {/* Map section */}
      <section aria-labelledby="map-heading" className="session-detail__section">
        <h2 id="map-heading">Route Map</h2>
        <RouteMap gps={gps} />
      </section>

      {/* Velocity chart section */}
      <section aria-labelledby="velocity-heading" className="session-detail__section">
        <h2 id="velocity-heading">Speed Over Time</h2>
        <VelocityChart gps={gps} />
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
