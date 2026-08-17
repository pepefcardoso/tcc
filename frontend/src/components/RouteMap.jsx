import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

const ZONES = [
  { max: 2.0, color: '#64748b', label: 'Rest / Walk (< 7.2 km/h)' },
  { max: 4.0, color: '#3b82f6', label: 'Jog (7.2 - 14.4 km/h)' },
  { max: 7.0, color: '#f59e0b', label: 'Run (14.4 - 25.2 km/h)' },
  { max: Infinity, color: '#dc2626', label: 'Sprint (≥ 25.2 km/h)' },
];

export function getSpeedZone(speed_ms) {
  for (const zone of ZONES) {
    if (speed_ms <= zone.max) {
      return { color: zone.color, label: zone.label };
    }
  }
  return { color: ZONES[ZONES.length - 1].color, label: ZONES[ZONES.length - 1].label };
}

export function buildColoredPolylines(gps) {
  if (!gps || gps.length < 2) return [];

  const segments = [];
  let currentSegment = null;

  for (let i = 0; i < gps.length; i++) {
    const pt = gps[i];
    const zone = getSpeedZone(pt.speed_ms);
    const coord = [pt.latitude, pt.longitude];

    if (!currentSegment) {
      currentSegment = {
        color: zone.color,
        label: zone.label,
        coords: [coord],
      };
    } else if (currentSegment.color === zone.color) {
      currentSegment.coords.push(coord);
    } else {
      currentSegment.coords.push(coord);
      segments.push(currentSegment);
      currentSegment = {
        color: zone.color,
        label: zone.label,
        coords: [coord],
      };
    }
  }

  if (currentSegment && currentSegment.coords.length > 1) {
    segments.push(currentSegment);
  }

  return segments;
}

function MapFitter({ gps }) {
  const map = useMap();

  useEffect(() => {
    if (gps && gps.length > 1) {
      const bounds = gps.map((pt) => [pt.latitude, pt.longitude]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [gps, map]);

  return null;
}

export default function RouteMap({ gps = [] }) {
  if (!gps || gps.length < 2) {
    return <p className="route-map__empty">No GPS data available.</p>;
  }

  const polylines = buildColoredPolylines(gps);

  return (
    <div className="route-map">
      <div className="route-map__map">
        <MapContainer
          center={[gps[0].latitude, gps[0].longitude]}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {polylines.map((seg, idx) => (
            <Polyline
              key={idx}
              positions={seg.coords}
              pathOptions={{ color: seg.color, weight: 4 }}
            />
          ))}
          <MapFitter gps={gps} />
        </MapContainer>
      </div>

      <div className="route-map__legend">
        {ZONES.map((zone) => (
          <div key={zone.label} className="route-map__legend-item">
            <div className="route-map__legend-color" style={{ backgroundColor: zone.color }}></div>
            <span>{zone.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
