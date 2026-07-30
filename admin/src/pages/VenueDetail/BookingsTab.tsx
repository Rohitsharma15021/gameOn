import { useQuery } from '@tanstack/react-query';
import { fetchVenueBookings } from '../../lib/endpoints';
import { Card, Pill, money } from '../../components/ui';
import type { Venue } from '../../types';

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'danger' | 'warning'> = {
  CONFIRMED: 'brand',
  PENDING: 'warning',
  CANCELLED: 'danger',
};

export default function BookingsTab({ venue }: { venue: Venue }) {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['venue-bookings', venue.id],
    queryFn: () => fetchVenueBookings(venue.id),
  });

  if (isLoading) return <p>Loading…</p>;
  if (!bookings?.length) {
    return <Card><p style={{ color: '#898781' }}>No bookings yet.</p></Card>;
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f9f9f7', textAlign: 'left' }}>
            {['Player', 'Court', 'When', 'Amount', 'Status', 'Payment'].map((h) => (
              <th key={h} style={{ padding: '12px 16px', fontWeight: 700, color: '#52514e' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} style={{ borderTop: '1px solid #e1e0d9' }}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 600 }}>{b.user.name}</div>
                <div style={{ color: '#898781', fontSize: 12 }}>{b.user.phone}</div>
              </td>
              <td style={{ padding: '12px 16px' }}>{b.slot.court.name}</td>
              <td style={{ padding: '12px 16px' }}>
                {new Date(b.slot.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {', '}
                {new Date(b.slot.startsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </td>
              <td style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums' }}>{money(b.amount)}</td>
              <td style={{ padding: '12px 16px' }}>
                <Pill tone={STATUS_TONE[b.status] ?? 'neutral'}>{b.status}</Pill>
              </td>
              <td style={{ padding: '12px 16px' }}>{b.paymentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
