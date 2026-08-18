import './AcwrBadge.css';

/**
 * Reusable badge showing ACWR value with color per zone.
 *
 * @param {Object} props
 * @param {number|null} props.value - The ACWR numeric value
 * @param {'blue'|'green'|'yellow'|'red'|null} props.zone - The risk zone
 * @param {'sm'|'md'} [props.size='md'] - The size variant
 */
export default function AcwrBadge({ value, zone, size = 'md' }) {
  if (zone === null || value === null) {
    return (
      <span
        className={`acwr-badge acwr-badge--none acwr-badge--${size}`}
        aria-label="ACWR — Insufficient history"
        title="Insufficient history to calculate ACWR"
      >
        N/D
      </span>
    );
  }

  return (
    <span
      className={`acwr-badge acwr-badge--${zone} acwr-badge--${size}`}
      aria-label={`ACWR ${value.toFixed(2)} — ${zone} zone`}
    >
      {value.toFixed(2)}
    </span>
  );
}
