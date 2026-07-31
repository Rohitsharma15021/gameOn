import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createVenue, fetchMyVenues } from '../lib/endpoints';
import { Button, Card, Field, Input, Pill } from '../components/ui';

export default function VenuesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: venues, isLoading } = useQuery({ queryKey: ['my-venues'], queryFn: fetchMyVenues });

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    latitude: '12.9716',
    longitude: '77.5946',
    sportsOffered: '',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createVenue({
        name: form.name,
        address: form.address,
        city: form.city,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        sportsOffered: form.sportsOffered.split(',').map((s) => s.trim()).filter(Boolean),
        amenities: [],
        images: [],
        openMinute: 360,
        closeMinute: 1380,
      }),
    onSuccess: (venue) => {
      qc.invalidateQueries({ queryKey: ['my-venues'] });
      setShowForm(false);
      navigate(`/venues/${venue.id}`);
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>My Venues</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ New venue'}</Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 24 }}>
          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Venue name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Sports offered (comma separated)">
              <Input
                value={form.sportsOffered}
                onChange={(e) => setForm({ ...form, sportsOffered: e.target.value })}
                placeholder="Badminton, Football"
              />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Latitude">
              <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </Field>
            <Field label="Longitude">
              <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </Field>
          </div>
          {createMutation.isError && (
            <p style={{ color: '#d03b3b', fontSize: 13 }}>{(createMutation.error as Error).message}</p>
          )}
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.name || !form.address || !form.city}
          >
            {createMutation.isPending ? 'Creating…' : 'Create venue'}
          </Button>
        </Card>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : venues?.length === 0 ? (
        <Card>
          <p style={{ color: '#898781' }}>No venues yet. Create your first listing to start accepting bookings.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {venues?.map((v) => (
            <Card key={v.id} style={{ cursor: 'pointer' }}>
              <div onClick={() => navigate(`/venues/${v.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{v.name}</h3>
                  {!v.isActive && <Pill tone="danger">Inactive</Pill>}
                </div>
                <p style={{ color: '#898781', fontSize: 13, margin: '6px 0' }}>{v.address}, {v.city}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {v.sportsOffered.map((s) => (
                    <Pill key={s} tone="brand">{s}</Pill>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#898781', marginTop: 10 }}>{v.courts.length} court(s)</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
