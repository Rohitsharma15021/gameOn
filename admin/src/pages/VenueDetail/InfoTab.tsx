import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteVenue, updateVenue } from '../../lib/endpoints';
import { Button, Card, Field, Input, Textarea } from '../../components/ui';
import type { Venue } from '../../types';
import { useNavigate } from 'react-router-dom';

const minutesToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export default function InfoTab({ venue }: { venue: Venue }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: venue.name,
    description: venue.description ?? '',
    address: venue.address,
    city: venue.city,
    phone: venue.phone ?? '',
    sportsOffered: venue.sportsOffered.join(', '),
    amenities: venue.amenities.join(', '),
    images: venue.images.join('\n'),
    openTime: minutesToTime(venue.openMinute),
    closeTime: minutesToTime(venue.closeMinute),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateVenue(venue.id, {
        name: form.name,
        description: form.description || undefined,
        address: form.address,
        city: form.city,
        phone: form.phone || undefined,
        sportsOffered: form.sportsOffered.split(',').map((s) => s.trim()).filter(Boolean),
        amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
        images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
        openMinute: timeToMinutes(form.openTime),
        closeMinute: timeToMinutes(form.closeTime),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venue', venue.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVenue(venue.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-venues'] });
      navigate('/venues');
    },
  });

  return (
    <Card>
      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Venue name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label="Opens at">
          <Input type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} />
        </Field>
        <Field label="Closes at">
          <Input type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} />
        </Field>
      </div>

      <Field label="Description">
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>

      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Sports offered (comma separated)">
          <Input value={form.sportsOffered} onChange={(e) => setForm({ ...form, sportsOffered: e.target.value })} />
        </Field>
        <Field label="Amenities (comma separated)">
          <Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
        </Field>
      </div>

      <Field label="Photo URLs (one per line)">
        <Textarea value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
      </Field>

      {saveMutation.isError && <p style={{ color: '#d03b3b', fontSize: 13 }}>{(saveMutation.error as Error).message}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Deactivate this venue? It will stop appearing in search and booking.')) {
              deleteMutation.mutate();
            }
          }}
        >
          Deactivate venue
        </Button>
      </div>
    </Card>
  );
}
