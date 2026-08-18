import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './PlayerLoadChart.css';

export function buildPlayerLoadCurve(gps, totalPlayerLoad) {
  if (!gps || gps.length < 2) return [];
  if (totalPlayerLoad === null || totalPlayerLoad === undefined || totalPlayerLoad <= 0) return [];

  const t0 = new Date(gps[0].time).getTime();
  const len = gps.length;
  const curve = [];

  for (let i = 0; i < len; i++) {
    const t_min = parseFloat(((new Date(gps[i].time).getTime() - t0) / 60000).toFixed(2));

    let pl = 0;
    if (i === len - 1) {
      pl = parseFloat(totalPlayerLoad.toFixed(3));
    } else {
      pl = parseFloat((totalPlayerLoad * (i / (len - 1))).toFixed(3));
    }

    curve.push({ t: t_min, pl });
  }

  return curve;
}

export default function PlayerLoadChart({ gps = [], totalPlayerLoad = null }) {
  const data = buildPlayerLoadCurve(gps, totalPlayerLoad);

  if (data.length === 0) {
    return <p className="player-load-chart__empty">No Player Load data available.</p>;
  }

  return (
    <div className="player-load-chart">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <defs>
            <linearGradient id="colorPl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="t"
            label={{ value: 'Time (min)', position: 'insideBottom', offset: -12 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: 'Player Load (AU)', angle: -90, position: 'insideLeft', offset: 12 }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(val) => [`${val} AU`, 'Player Load']}
            labelFormatter={(l) => `${l} min`}
          />
          <Area
            type="monotone"
            dataKey="pl"
            stroke="var(--color-success)"
            fillOpacity={1}
            fill="url(#colorPl)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
