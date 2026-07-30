import { api } from './client';
import type { Game, SkillLevel } from '../types/api';

export interface GameSearchParams {
  sport?: string;
  skillLevel?: SkillLevel;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  onlyOpen?: boolean;
  page?: number;
  limit?: number;
}

export const searchGames = (params: GameSearchParams) =>
  api.get<{ games: Game[]; total: number; hasMore: boolean }>('/games', { params }).then((r) => r.data);

export const fetchMyGames = () =>
  api.get<{ upcoming: Game[]; past: Game[] }>('/games/mine').then((r) => r.data);

export const fetchGame = (id: string) => api.get<{ game: Game }>(`/games/${id}`).then((r) => r.data.game);

export interface CreateGameInput {
  title?: string;
  sport: string;
  skillLevel: SkillLevel;
  maxPlayers: number;
  costPerPlayer?: number;
  description?: string;
  autoApprove?: boolean;
  bookingId?: string;
  venueId?: string;
  courtId?: string;
  startsAt?: string;
  endsAt?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  inviteNearby?: boolean;
}

export const createGame = (data: CreateGameInput) =>
  api.post<{ game: Game }>('/games', data).then((r) => r.data.game);

export const joinGame = (id: string) =>
  api.post<{ game: Game; pendingApproval?: boolean }>(`/games/${id}/join`).then((r) => r.data);

export const leaveGame = (id: string, userId: string) =>
  api.delete<{ game: Game }>(`/games/${id}/players/${userId}`).then((r) => r.data.game);

export const approvePlayer = (id: string, userId: string) =>
  api.post<{ game: Game }>(`/games/${id}/players/${userId}/approve`).then((r) => r.data.game);

export const updateGame = (id: string, data: Partial<CreateGameInput> & { status?: string }) =>
  api.patch<{ game: Game }>(`/games/${id}`, data).then((r) => r.data.game);

export const fetchSuggestedPlayers = (id: string) =>
  api
    .get<{ suggestions: { user: { id: string; name: string; avatarUrl: string | null }; distanceKm: number | null }[] }>(
      `/games/${id}/suggested-players`,
    )
    .then((r) => r.data.suggestions);
