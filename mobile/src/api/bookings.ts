import { api } from './client';
import type { Booking } from '../types/api';

export interface CreateBookingInput {
  slotId: string;
  notes?: string;
  splitWith?: { userId?: string; phone?: string; name?: string }[];
}

export interface CheckoutInfo {
  provider: string;
  orderId?: string;
  amount: number;
  currency: string;
  amountDue: number;
  keyId?: string;
  clientSecret?: string;
  autoSettle?: boolean;
}

export const createBooking = (data: CreateBookingInput) =>
  api
    .post<{ booking: Booking; payment: CheckoutInfo; holdExpiresAt: string }>('/bookings', data)
    .then((r) => r.data);

export const confirmBooking = (id: string, paymentId?: string, signature?: string) =>
  api.post<{ booking: Booking }>(`/bookings/${id}/confirm`, { paymentId, signature }).then((r) => r.data.booking);

export const fetchBookings = (scope: 'upcoming' | 'past' | 'all' = 'all') =>
  api.get<{ bookings: Booking[] }>('/bookings', { params: { scope } }).then((r) => r.data.bookings);

export const fetchBooking = (id: string) =>
  api.get<{ booking: Booking }>(`/bookings/${id}`).then((r) => r.data.booking);

export const cancelBooking = (id: string) =>
  api
    .post<{ booking: Booking; refund: { eligible: boolean; amount: number; reason: string | null } }>(
      `/bookings/${id}/cancel`,
    )
    .then((r) => r.data);

export const paySplit = (bookingId: string, splitId: string) =>
  api.post(`/bookings/${bookingId}/splits/${splitId}/pay`).then((r) => r.data);

export const fetchPaymentConfig = () =>
  api
    .get<{ provider: string; currency: string; razorpayKeyId: string | null }>('/payments/config')
    .then((r) => r.data);
