import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchAnalytics } from '../../lib/endpoints';
import { Card, StatTile, money } from '../../components/ui';
import type { Venue } from '../../types';

const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];

const RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export default function AnalyticsTab({ venue }: { venue: Venue }) {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', venue.id, days],
    queryFn: () => fetchAnalytics(venue.id, days),
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setDays(r.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid #e1e0d9',
              background: days === r.value ? '#0b0b0b' : 'transparent',
              color: days === r.value ? '#fff' : '#52514e',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <p>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatTile label="Bookings" value={String(data.bookingCount)} />
            <StatTile label="Gross revenue" value={money(data.grossRevenue)} tone="brand" />
            <StatTile label="Net revenue (after fees)" value={money(data.netRevenue)} tone="brand" />
            <StatTile label="Slot utilisation" value={`${data.utilisationPct}%`} />
          </div>

          <Card style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Revenue over time</h3>
            {data.revenueByDay.length === 0 ? (
              <p style={{ color: '#898781', fontSize: 13 }}>No bookings in this range yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.revenueByDay} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    tick={{ fontSize: 11, fill: '#898781' }}
                    axisLine={{ stroke: '#c3c2b7' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${Math.round(v / 100)}`}
                    tick={{ fontSize: 11, fill: '#898781' }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value) => [money(Number(value)), 'Revenue']}
                    labelFormatter={(d) => new Date(String(d)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 13 }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3, fill: '#2a78d6' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Card>
              <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Revenue by court</h3>
              {data.revenueByCourt.length === 0 ? (
                <p style={{ color: '#898781', fontSize: 13 }}>No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.revenueByCourt} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `₹${Math.round(v / 100)}`} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="court" tick={{ fontSize: 12, fill: '#0b0b0b' }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip formatter={(value) => [money(Number(value)), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 13 }} />
                    <Bar dataKey="amount" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Bookings by sport</h3>
              {data.bookingsBySport.length === 0 ? (
                <p style={{ color: '#898781', fontSize: 13 }}>No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.bookingsBySport} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                    <XAxis dataKey="sport" tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 13 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                      {data.bookingsBySport.map((entry, i) => (
                        <Cell key={entry.sport} fill={CATEGORICAL[i % CATEGORICAL.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
