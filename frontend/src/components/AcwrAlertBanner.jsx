import { Link } from 'react-router-dom';
import './AcwrAlertBanner.css';

/**
 * Displays a dismissible-style alert banner when one or more athletes
 * have ACWR > 1.50 (RF18 high-risk zone).
 *
 * @param {Object} props
 * @param {Array<{athlete_id: string, name: string}>} props.athletes - High-risk athletes
 */
export default function AcwrAlertBanner({ athletes }) {
  if (!athletes || athletes.length === 0) return null;

  return (
    <div
      className="acwr-alert-banner"
      role="alert"
      aria-live="polite"
      aria-label={`High risk alert: ${athletes.length} athlete(s) with ACWR above 1.50`}
    >
      <span className="acwr-alert-banner__icon" aria-hidden="true">⚠️</span>
      <div className="acwr-alert-banner__body">
        <span className="acwr-alert-banner__title">High Risk Alert — ACWR &gt; 1.50</span>
        <ul className="acwr-alert-banner__list" aria-label="Affected athletes">
          {athletes.map((a, index) => (
            <li key={a.athlete_id} className="acwr-alert-banner__item">
              <Link to={`/athletes/${a.athlete_id}`} className="acwr-alert-banner__link">
                {a.name}
              </Link>
              {index < athletes.length - 1 && <span className="acwr-alert-banner__separator">, </span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
