import { api } from './client';
import type { CourtAvailability, Review, Venue } from '../types/api';

export interface VenueSearchParams {
  search?: string;
  sport?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'distance' | 'rating' | 'price';
  page?: number;
  limit?: number;
}

export const searchVenues = (params: VenueSearchParams) =>
  api.get<{ venues: Venue[]; total: number; hasMore: boolean }>('/venues', { params }).then((r) => r.data);

export const fetchVenue = (id: string) =>
  api
    .get<{ venue: Venue; reviews: Review[]; upcomingGames: unknown[] }>(`/venues/${id}`)
    .then((r) => r.data);

export const fetchAvailability = (venueId: string, date: string, sport?: string) =>
  api
    .get<{ date: string; courts: CourtAvailability[] }>(`/venues/${venueId}/availability`, {
      params: { date, sport },
    })
    .then((r) => r.data);

export const fetchSportsMeta = () =>
  api
    .get<{ sports: { sport: string; courtCount: number; fromPrice: number }[] }>('/venues/meta/sports')
    .then((r) => r.data.sports);
