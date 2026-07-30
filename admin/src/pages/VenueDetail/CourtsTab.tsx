import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCourt, deleteCourt, updateCourt } from '../../lib/endpoints';
import { Button, Card, Field, Input, Pill } from '../../components/ui';
import type { Court, Venue } from '../../types';

export default function CourtsTab({ venue }: { venue: Venue }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sportType: venue.sportsOffered[0] ?? '', pricePerHour: '', slotMinutes: '60', capacity: '10', isIndoor: false });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['venue', venue.id] });

  const createMutation = useMutation({
    mutationFn: () =>
      createCourt(venue.id, {
        name: form.name,
        sportType: form.sportType,
        pricePerHour: Math.round(parseFloat(form.pricePerHour) * 100),
        slotMinutes: parseInt(form.slotMinutes, 10),
        capacity: parseInt(form.capacity, 10),
        isIndoor: form.isIndoor,
      }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ name: '', sportType: venue.sportsOffered[0] ?? '', pricePerHour: '', slotMinutes: '60', capacity: '10', isIndoor: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourt(id),
    onSuccess: invalidate,
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, pricePerHour }: { id: string; pricePerHour: number }) => updateCourt(id, { pricePerHour }),
    onSuccess: invalidate,
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Courts & Turfs</h3>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ Add court'}</Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Court 1" />
            </Field>
            <Field label="Sport">
              <Input value={form.sportType} onChange={(e) => setForm({ ...form, sportType: e.target.value })} />
            </Field>
            <Field label="Price/hour (₹)">
              <Input type="number" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} />
            </Field>
            <Field label="Slot length (min)">
              <Input type="number" value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: e.target.value })} />
            </Field>
          </div>
          {createMutation.isError && <p style={{ color: '#d03b3b', fontSize: 13 }}>{(createMutation.error as Error).message}</p>}
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.name || !form.sportType || !form.pricePerHour}
          >
            {createMutation.isPending ? 'Adding…' : 'Add court'}
          </Button>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {venue.courts.map((court) => (
          <CourtRow
            key={court.id}
            court={court}
            onDelete={() => {
              if (confirm(`Remove ${court.name}?`)) deleteMutation.mutate(court.id);
            }}
            onPriceChange={(price) => priceMutation.mutate({ id: court.id, pricePerHour: price })}
          />
        ))}
      </div>
    </div>
  );
}

function CourtRow({ court, onDelete, onPriceChange }: { court: Court; onDelete: () => void; onPriceChange: (price: number) => void }) {
  const [price, setPrice] = useState(String(court.pricePerHour / 100));

  return (
    <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
      <div>
        <div style={{ fontWeight: 700 }}>{court.name}</div>
        <div style={{ fontSize: 12, color: '#898781', marginTop: 2 }}>
          {court.sportType} · {court.slotMinutes} min slots · Capacity {court.capacity}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!court.isActive && <Pill tone="danger">Inactive</Pill>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#898781' }}>₹</span>
          <Input
            style={{ width: 80 }}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => {
              const val = Math.round(parseFloat(price) * 100);
              if (val && val !== court.pricePerHour) onPriceChange(val);
            }}
          />
          <span style={{ fontSize: 12, color: '#898781' }}>/hr</span>
        </div>
        <Button variant="danger" onClick={onDelete}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
