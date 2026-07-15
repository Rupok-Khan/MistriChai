import React from "react";

const COLORS = ["#20a875", "#ffb547", "#6c63ff", "#2f8cff", "#f0648b"];

export default function DashboardInsights({ title, subtitle, segments = [], bars = [], highlight }) {
  const safeSegments = segments.map((item, index) => ({ ...item, value: Math.max(0, Number(item.value || 0)), color: item.color || COLORS[index % COLORS.length] }));
  const total = safeSegments.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const stops = safeSegments.map((item) => {
    const start = total ? (cursor / total) * 100 : 0;
    cursor += item.value;
    return `${item.color} ${start}% ${total ? (cursor / total) * 100 : 0}%`;
  });
  const donut = total ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#e7ece9 0 100%)";
  const maxBar = Math.max(1, ...bars.map((item) => Number(item.value || 0)));

  return (
    <section className="dashboard-insights" aria-label={title}>
      <div className="insight-chart-card">
        <div className="insight-card-head"><div><h4>{title}</h4><p>{subtitle}</p></div><span className="insight-menu">•••</span></div>
        <div className="insight-donut-layout">
          <div className="insight-donut" style={{ background: donut }}><div className="insight-donut-center"><strong>{total}</strong><span>Total</span></div></div>
          <div className="insight-legend">
            {safeSegments.map((item) => <div className="insight-legend-item" key={item.label}><span className="insight-dot" style={{ background: item.color }} /><span>{item.label}</span><b>{item.value}</b></div>)}
          </div>
        </div>
      </div>
      <div className="insight-chart-card">
        <div className="insight-card-head"><div><h4>Activity overview</h4><p>Live workload comparison</p></div>{highlight && <span className="insight-highlight">{highlight}</span>}</div>
        <div className="insight-bars" role="img" aria-label="Activity comparison bar chart">
          {bars.map((item, index) => <div className="insight-bar-column" key={item.label}><span className="insight-bar-value">{item.value}</span><div className="insight-bar-track"><span style={{ height: `${Math.max(12, (Number(item.value || 0) / maxBar) * 100)}%`, background: item.color || COLORS[index % COLORS.length] }} /></div><small>{item.label}</small></div>)}
        </div>
      </div>
      <div className="insight-pulse-card"><span className="insight-pulse-orb" /><div className="insight-pulse-copy"><small>Workspace pulse</small><strong>Everything at a glance</strong></div><div className="insight-sparkline" aria-hidden="true">{[28,48,38,72,55,84,68,94].map((height,index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div>
    </section>
  );
}
