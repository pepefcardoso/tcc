import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import './WeeklyLoadChart.css';

export function buildWeeklyChartData(sessions) {
  if (!sessions || sessions.length === 0) return [];

  const validSessions = sessions.filter((s) => s.session_load > 0 && s.started_at);
  if (validSessions.length === 0) return [];

  const getSundayUTC = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getUTCDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  };

  const getWeekLabelUTC = (time) => {
    const d = new Date(time);
    d.setUTCDate(d.getUTCDate() - 3);
    const year = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const dayOfWeek = yearStart.getUTCDay() || 7;
    const offset = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;
    const firstMonday = new Date(Date.UTC(year, 0, 1 + offset));
    const weekNo = Math.floor((d - firstMonday) / 86400000 / 7) + 1;
    return `${year}-W${weekNo.toString().padStart(2, '0')}`;
  };

  const weeklyLoads = {};
  let minTime = Infinity;
  let maxTime = -Infinity;

  validSessions.forEach((s) => {
    const sundayTime = getSundayUTC(s.started_at);
    if (sundayTime < minTime) minTime = sundayTime;
    if (sundayTime > maxTime) maxTime = sundayTime;

    if (!weeklyLoads[sundayTime]) {
      weeklyLoads[sundayTime] = 0;
    }
    weeklyLoads[sundayTime] += s.session_load;
  });

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const chartData = [];

  for (let t = minTime; t <= maxTime; t += ONE_WEEK_MS) {
    const load = weeklyLoads[t] || 0;

    const t0 = t;
    const t1 = t - ONE_WEEK_MS;
    const t2 = t - 2 * ONE_WEEK_MS;
    const t3 = t - 3 * ONE_WEEK_MS;

    const w0 = weeklyLoads[t0] || 0;
    const w1 = weeklyLoads[t1] || 0;
    const w2 = weeklyLoads[t2] || 0;
    const w3 = weeklyLoads[t3] || 0;

    const chronicSum = w0 + w1 + w2 + w3;
    const chronicLoad = chronicSum / 4;

    let acwr = null;
    if (chronicLoad > 0) {
      acwr = parseFloat((w0 / chronicLoad).toFixed(4));
    }

    chartData.push({
      week: getWeekLabelUTC(t),
      weeklyLoad: parseFloat(load.toFixed(1)),
      acwr: acwr,
    });
  }

  return chartData;
}

export default function WeeklyLoadChart({ sessions = [] }) {
  const data = buildWeeklyChartData(sessions);

  if (data.length === 0) {
    return <p className="weekly-load-chart__empty">No valid sessions to display chart.</p>;
  }

  const sufficientHistory = data.length >= 4;

  return (
    <div className="weekly-load-chart">
      {!sufficientHistory && (
        <p className="weekly-load-chart__notice">
          Note: ACWR trend requires at least 4 weeks of history to be fully accurate.
        </p>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12 }}
            label={{ value: 'Week', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            yAxisId="load"
            orientation="left"
            tick={{ fontSize: 12 }}
            label={{ value: 'Weekly Load (AU)', angle: -90, position: 'insideLeft', offset: 0 }}
          />
          <YAxis
            yAxisId="acwr"
            orientation="right"
            domain={[0, 2.5]}
            tick={{ fontSize: 12 }}
            label={{ value: 'ACWR', angle: 90, position: 'insideRight', offset: 0 }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'weeklyLoad') return [`${value} AU`, 'Weekly Load'];
              if (name === 'acwr') return [value === null ? 'N/D' : value.toFixed(2), 'ACWR'];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar
            yAxisId="load"
            dataKey="weeklyLoad"
            name="Weekly Load"
            fill="var(--color-primary)"
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="acwr"
            type="monotone"
            dataKey="acwr"
            name="ACWR"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4 }}
            connectNulls
          />
          <ReferenceLine
            y={0.8}
            yAxisId="acwr"
            stroke="var(--color-success)"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={1.5}
            yAxisId="acwr"
            stroke="var(--color-danger)"
            strokeDasharray="3 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
