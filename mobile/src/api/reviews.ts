import { api } from './client';
import type { Review } from '../types/api';

export const submitReview = (data: {
  targetType: 'VENUE' | 'PLAYER';
  targetId: string;
  rating: number;
  comment?: string;
}) => api.post<{ review: Review }>('/reviews', data).then((r) => r.data.review);

export const fetchPendingVenueReviews = () =>
  api
    .get<{ venues: { id: string; name: string; images: string[]; playedAt: string }[] }>('/reviews/pending')
    .then((r) => r.data.venues);
