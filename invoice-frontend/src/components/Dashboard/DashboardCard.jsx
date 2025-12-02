// src/components/Dashboard/DashboardCard.jsx
import React from 'react';

export default function DashboardCard({ title, value, subtitle }) {
  return (
    <div
      className="shadow rounded-xl p-4 bg-white"
      style={{ minWidth: 180, minHeight: 80 }}
    >
      <div style={{ color: '#6b7280', fontSize: 13 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>
        {typeof value === 'number' ? value.toLocaleString() : value ?? '-'}
      </div>
      {subtitle ? <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{subtitle}</div> : null}
    </div>
  );
}
