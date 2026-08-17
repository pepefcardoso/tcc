import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './VelocityChart.css';

export function transformGpsSamples(gps) {
  if (!gps || gps.length === 0) return [];
  const t0 = new Date(gps[0].time).getTime();
  return gps.map((pt) => ({
    t: parseFloat(((new Date(pt.time).getTime() - t0) / 60000).toFixed(2)),
    speed: parseFloat((pt.speed_ms * 3.6).toFixed(2)),
  }));
}

export default function VelocityChart({ gps = [] }) {
  const data = transformGpsSamples(gps);

  if (data.length === 0) {
    return <p className="velocity-chart__empty">No GPS data available.</p>;
  }

  return (
    <div className="velocity-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="t"
            label={{ value: 'Time (min)', position: 'insideBottom', offset: -12 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', offset: 12 }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(val) => [`${val} km/h`, 'Speed']} labelFormatter={(l) => `${l} min`} />
          <Line
            type="monotone"
            dataKey="speed"
            stroke="var(--color-primary)"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
