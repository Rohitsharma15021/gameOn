import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockSlot, fetchCourtCalendar, unblockSlot } from '../../lib/endpoints';
import { Card, Pill, money } from '../../components/ui';
import type { Venue } from '../../types';

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'danger' | 'warning'> = {
  AVAILABLE: 'neutral',
  BOOKED: 'brand',
  HELD: 'warning',
  BLOCKED: 'danger',
};

export default function CalendarTab({ venue }: { venue: Venue }) {
  const qc = useQueryClient();
  const [courtId, setCourtId] = useState(venue.courts[0]?.id ?? '');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: slots, isLoading } = useQuery({
    queryKey: ['calendar', courtId, date],
    queryFn: () => fetchCourtCalendar(courtId, date),
    enabled: !!courtId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['calendar', courtId, date] });
  const blockMutation = useMutation({ mutationFn: blockSlot, onSuccess: invalidate });
  const unblockMutation = useMutation({ mutationFn: unblockSlot, onSuccess: invalidate });

  if (!venue.courts.length) {
    return <Card><p style={{ color: '#898781' }}>Add a court first to manage its calendar.</p></Card>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <select
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e1e0d9' }}
        >
          {venue.courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e1e0d9' }}
        />
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {slots?.map((slot) => {
            const time = new Date(slot.startsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
            const canBlock = slot.status === 'AVAILABLE';
            const canUnblock = slot.status === 'BLOCKED';
            return (
              <Card key={slot.id} style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{time}</span>
                  <Pill tone={STATUS_TONE[slot.status]}>{slot.status}</Pill>
                </div>
                <div style={{ fontSize: 12, color: '#898781', marginTop: 6 }}>{money(slot.price)}</div>
                {slot.booking && (
                  <div style={{ fontSize: 11, color: '#52514e', marginTop: 6 }}>
                    {slot.booking.user.name} · {slot.booking.user.phone}
                  </div>
                )}
                {(canBlock || canUnblock) && (
                  <button
                    onClick={() =>
                      canBlock ? blockMutation.mutate(slot.id) : unblockMutation.mutate(slot.id)
                    }
                    style={{
                      marginTop: 8,
                      width: '100%',
                      padding: '6px 0',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: '1px solid #e1e0d9',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: canBlock ? '#d03b3b' : '#15803d',
                    }}
                  >
                    {canBlock ? 'Block slot' : 'Unblock slot'}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
