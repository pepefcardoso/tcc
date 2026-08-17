import { Link } from 'react-router-dom';
import './SessionList.css';

export default function SessionList({ sessions = [], sortField = 'date', sortDir = 'desc', onSort }) {
  if (sessions.length === 0) {
    return (
      <div className="session-list-empty">
        <p>No sessions found.</p>
      </div>
    );
  }

  const handleSort = () => {
    if (onSort) onSort('date');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return <span className="status-badge status-badge--synced">Synced</span>;
      case 'processing':
        return <span className="status-badge status-badge--processing">Processing</span>;
      case 'pending':
        return <span className="status-badge status-badge--pending">Pending</span>;
      default:
        return <span className="status-badge status-badge--pending">Unknown</span>;
    }
  };

  return (
    <div className="session-list-container">
      <table className="session-table">
        <thead>
          <tr>
            <th>Athlete</th>
            <th>Device ID</th>
            <th>
              <button type="button" className="sort-btn" onClick={handleSort}>
                Date {sortDir === 'asc' ? '▲' : '▼'}
              </button>
            </th>
            <th>Duration</th>
            <th>Sync Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td data-label="Athlete">{session.athleteName || '—'}</td>
              <td data-label="Device ID">{session.device_id || '—'}</td>
              <td data-label="Date">
                {session.started_at ? new Date(session.started_at).toLocaleString() : '—'}
              </td>
              <td data-label="Duration">
                {session.duration_minutes != null ? `${session.duration_minutes} min` : '—'}
              </td>
              <td data-label="Sync Status">{getStatusBadge(session.sync_status)}</td>
              <td data-label="Actions" className="session-actions">
                <Link to={`/sessions/${session.id}`} title="Coming soon">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
