import { Link } from 'react-router-dom';
import './AthleteList.css';

export default function AthleteList({ athletes = [], onEdit, onInactivate }) {
  if (athletes.length === 0) {
    return (
      <div className="athlete-list-empty">
        <p>No athletes found.</p>
      </div>
    );
  }

  return (
    <div className="athlete-list-container">
      <table className="athlete-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Birth Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((athlete) => (
            <tr key={athlete.id || athlete.athlete_id}>
              <td data-label="Name">{athlete.name}</td>
              <td data-label="Position">{athlete.position || '-'}</td>
              <td data-label="Birth Date">
                {athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString() : '-'}
              </td>
              <td data-label="Status">
                {athlete.active ? (
                  <span className="status-badge status-badge--active">Active</span>
                ) : (
                  <span className="status-badge status-badge--inactive">Inactive</span>
                )}
              </td>
              <td data-label="Actions" className="athlete-actions">
                <Link to={`/athletes/${athlete.id || athlete.athlete_id}`}>View</Link>
                {onEdit && (
                  <button type="button" onClick={() => onEdit(athlete)} className="btn-text btn-edit">
                    Edit
                  </button>
                )}
                {onInactivate && athlete.active && (
                  <button type="button" onClick={() => onInactivate(athlete.id || athlete.athlete_id)} className="btn-text btn-inactivate">
                    Inactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
