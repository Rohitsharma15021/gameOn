import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyVenues } from '../../lib/endpoints';
import InfoTab from './InfoTab';
import CourtsTab from './CourtsTab';
import CalendarTab from './CalendarTab';
import BookingsTab from './BookingsTab';
import AnalyticsTab from './AnalyticsTab';

const TABS = ['Info', 'Courts', 'Calendar', 'Bookings', 'Analytics'] as const;
type Tab = (typeof TABS)[number];

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('Info');

  // Reuses the owner venue list query (already includes courts) rather than a
  // separate single-venue endpoint — keeps this in sync with VenuesList for free.
  const { data: venues, isLoading } = useQuery({ queryKey: ['my-venues'], queryFn: fetchMyVenues });
  const venue = venues?.find((v) => v.id === id);

  if (isLoading) return <p>Loading…</p>;
  if (!venue) return <p>Venue not found. <Link to="/venues">Back to venues</Link></p>;

  return (
    <div>
      <button
        onClick={() => navigate('/venues')}
        style={{ background: 'none', border: 'none', color: '#898781', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >
        ← All venues
      </button>
      <h1 style={{ fontSize: 24, margin: '0 0 20px' }}>{venue.name}</h1>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(11,11,11,0.1)', marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid #16a34a' : '2px solid transparent',
              color: tab === t ? '#15803d' : '#52514e',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Info' && <InfoTab venue={venue} />}
      {tab === 'Courts' && <CourtsTab venue={venue} />}
      {tab === 'Calendar' && <CalendarTab venue={venue} />}
      {tab === 'Bookings' && <BookingsTab venue={venue} />}
      {tab === 'Analytics' && <AnalyticsTab venue={venue} />}
    </div>
  );
}
