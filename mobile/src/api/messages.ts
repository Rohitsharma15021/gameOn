import { api } from './client';
import type { Message } from '../types/api';

export const fetchMessages = (gameId: string, before?: string) =>
  api
    .get<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }>(
      `/games/${gameId}/messages`,
      { params: { before } },
    )
    .then((r) => r.data);

export const sendMessage = (gameId: string, text: string) =>
  api.post<{ message: Message }>(`/games/${gameId}/messages`, { text }).then((r) => r.data.message);
