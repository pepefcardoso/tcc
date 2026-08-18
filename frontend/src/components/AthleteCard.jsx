import { Link } from 'react-router-dom';
import AcwrBadge from './AcwrBadge.jsx';
import './AthleteCard.css';

/**
 * Renders a summary card for an athlete on the dashboard.
 * 
 * @param {Object} props
 * @param {Object} props.athlete The athlete dashboard data
 */
export default function AthleteCard({ athlete }) {
  const { athlete_id, name, latest_session, acwr } = athlete;

  return (
    <div className="athlete-card">
      <div className="athlete-card__header">
        <h3 className="athlete-card__name">
          <Link to={`/athletes/${athlete_id}`}>{name}</Link>
        </h3>
        <AcwrBadge value={acwr?.value ?? null} zone={acwr?.zone ?? null} size="sm" />
      </div>

      {latest_session ? (
        <div className="athlete-card__metrics">
          <p className="athlete-card__date">
            Latest: {new Date(latest_session.date).toLocaleDateString('pt-BR')}
          </p>
          
          <div className="athlete-card__metric-row">
            <span>Distance:</span>
            <span className="athlete-card__metric-value">
              {latest_session.total_distance_m ?? 0} m
            </span>
          </div>
          
          <div className="athlete-card__metric-row">
            <span>Max Speed:</span>
            <span className="athlete-card__metric-value">
              {(latest_session.max_speed_kmh ?? 0).toFixed(1)} km/h
            </span>
          </div>
          
          <div className="athlete-card__metric-row">
            <span>Sprints:</span>
            <span className="athlete-card__metric-value">
              {latest_session.sprint_count ?? 0}
            </span>
          </div>
          
          <div className="athlete-card__metric-row">
            <span>Player Load:</span>
            <span className="athlete-card__metric-value">
              {(latest_session.player_load ?? 0).toFixed(1)}
            </span>
          </div>

          {latest_session.pse_pending && (
            <div className="athlete-card__footer">
              <span className="athlete-card__pse-badge">PSE Pending</span>
            </div>
          )}
        </div>
      ) : (
        <p className="athlete-card__no-session">No sessions yet</p>
      )}
    </div>
  );
}
