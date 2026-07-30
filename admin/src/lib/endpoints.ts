import { api } from './api';
import type { AdminUser, Analytics, CalendarSlot, Court, Venue, VenueBooking } from '../types';

// ---- Auth ----
export const requestOtp = (phone: string) =>
  api.post<{ phone: string; devCode?: string }>('/auth/otp/request', { phone }).then((r) => r.data);

export const verifyOtp = (phone: string, code: string) =>
  api
    .post<{ token: string; user: AdminUser }>('/auth/otp/verify', { phone, code })
    .then((r) => r.data);

// ---- Venues ----
export const fetchMyVenues = () => api.get<{ venues: Venue[] }>('/admin/venues').then((r) => r.data.venues);

export interface VenueInput {
  name: string;
  description?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  sportsOffered: string[];
  amenities: string[];
  images: string[];
  openMinute: number;
  closeMinute: number;
  phone?: string;
}

export const createVenue = (data: VenueInput) =>
  api.post<{ venue: Venue }>('/admin/venues', data).then((r) => r.data.venue);

export const updateVenue = (id: string, data: Partial<VenueInput>) =>
  api.patch<{ venue: Venue }>(`/admin/venues/${id}`, data).then((r) => r.data.venue);

export const deleteVenue = (id: string) => api.delete(`/admin/venues/${id}`);

// ---- Courts ----
export interface CourtInput {
  name: string;
  sportType: string;
  pricePerHour: number;
  slotMinutes?: number;
  surface?: string;
  isIndoor?: boolean;
  capacity?: number;
}

export const createCourt = (venueId: string, data: CourtInput) =>
  api.post<{ court: Court }>(`/admin/venues/${venueId}/courts`, data).then((r) => r.data.court);

export const updateCourt = (id: string, data: Partial<CourtInput>) =>
  api.patch<{ court: Court }>(`/admin/courts/${id}`, data).then((r) => r.data.court);

export const deleteCourt = (id: string) => api.delete(`/admin/courts/${id}`);

// ---- Calendar / slots ----
export const fetchCourtCalendar = (courtId: string, date: string) =>
  api
    .get<{ slots: CalendarSlot[] }>(`/admin/courts/${courtId}/calendar`, { params: { date } })
    .then((r) => r.data.slots);

export const blockSlot = (slotId: string) =>
  api.post<{ slot: CalendarSlot }>(`/admin/slots/${slotId}/block`).then((r) => r.data.slot);

export const unblockSlot = (slotId: string) =>
  api.post<{ slot: CalendarSlot }>(`/admin/slots/${slotId}/unblock`).then((r) => r.data.slot);

// ---- Bookings & analytics ----
export const fetchVenueBookings = (venueId: string) =>
  api.get<{ bookings: VenueBooking[] }>(`/admin/venues/${venueId}/bookings`).then((r) => r.data.bookings);

export const fetchAnalytics = (venueId: string, days = 30) =>
  api.get<Analytics>(`/admin/venues/${venueId}/analytics`, { params: { days } }).then((r) => r.data);
