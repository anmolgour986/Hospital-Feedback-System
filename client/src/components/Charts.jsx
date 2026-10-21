import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { STATUS_COLOR } from '../constants';

// Categorical order from the validated reference palette (fixed order, never cycled)
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const GRID = '#e2e8f0';
const AXIS = '#64748b';

export function fmtPeriod(p) {
  if (!p) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) {
    const [y, m, d] = p.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, m] = p.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  return p.replace(/^\d{4}-/, '');
}

const tipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 14px rgba(15,23,42,.1)' };

export function TrendChart({ data, lines, domain, tall }) {
  const { t } = useTranslation();
  if (!data || !data.length) return <p className="muted center" style={{ padding: 40 }}>{t('No results found')}</p>;
  return (
    <div className={`chart-box ${tall ? 'tall' : ''}`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tickFormatter={fmtPeriod} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
          <YAxis domain={domain} allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tipStyle} labelFormatter={fmtPeriod} />
          {lines.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />}
          {lines.map((l, i) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={t(l.name)} stroke={l.color || SERIES[i]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut with an always-visible HTML legend that carries the counts (identity is never colour-only)
export function Donut({ data, colors = {} }) {
  const { t } = useTranslation();
  const rows = (data || []).filter((d) => d.value > 0);
  const total = rows.reduce((a, d) => a + d.value, 0);
  if (!total) return <p className="muted center" style={{ padding: 40 }}>{t('No results found')}</p>;
  const colorOf = (d, i) => colors[d.name] || STATUS_COLOR[d.name] || SERIES[i % SERIES.length];
  return (
    <div>
      <div className="chart-box" style={{ height: 200 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2} stroke="#fff" strokeWidth={2}>
              {rows.map((d, i) => <Cell key={d.name} fill={colorOf(d, i)} />)}
            </Pie>
            <Tooltip contentStyle={tipStyle} formatter={(v, n) => [v, t(n)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="legend">
        {rows.map((d, i) => (
          <li key={d.name}>
            <i style={{ background: colorOf(d, i) }} />
            <span>{t(d.name)}</span>
            <b>{d.value}</b>
            <small>{Math.round((d.value / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal bars, single series (no legend needed), value labels on the bar ends
export function HBars({ data, nameKey = 'name', valueKey = 'value', color = SERIES[0], max, height, format }) {
  const { t } = useTranslation();
  if (!data || !data.length) return <p className="muted center" style={{ padding: 40 }}>{t('No results found')}</p>;
  return (
    <div className="chart-box" style={{ height: height || Math.max(180, data.length * 34 + 30) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, max || 'auto']} allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey={nameKey} width={112} tick={{ fill: '#334155', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => { const s = t(v); return s.length > 17 ? `${s.slice(0, 16)}…` : s; }} />
          <Tooltip contentStyle={tipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v) => [format ? format(v) : v, '']} labelFormatter={(l) => t(l)} />
          <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', fill: '#334155', fontSize: 12, formatter: (v) => (format ? format(v) : v) }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColumnBars({ data, nameKey = 'name', valueKey = 'value', colors = {}, color = SERIES[0], height = 220 }) {
  const { t } = useTranslation();
  if (!data || !data.length) return <p className="muted center" style={{ padding: 40 }}>{t('No results found')}</p>;
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }} barCategoryGap={12}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={nameKey} tickFormatter={(v) => t(String(v))} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tipStyle} cursor={{ fill: '#f1f5f9' }} labelFormatter={(l) => t(String(l))} formatter={(v) => [v, '']} />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} maxBarSize={44} label={{ position: 'top', fill: '#334155', fontSize: 12 }}>
            {data.map((d, i) => <Cell key={d[nameKey]} fill={colors[d[nameKey]] || STATUS_COLOR[d[nameKey]] || color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
