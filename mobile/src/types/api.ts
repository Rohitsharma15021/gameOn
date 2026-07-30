export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
export type Role = 'PLAYER' | 'VENUE_OWNER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  sportPreferences: string[];
  skillLevel: SkillLevel;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  // Only present when viewing your own profile.
  phone?: string;
  email?: string | null;
  role?: Role;
  latitude?: number | null;
  longitude?: number | null;
  referralCode?: string;
  rewardPoints?: number;
  onboardedAt?: string | null;
}

export interface Court {
  id: string;
  venueId?: string;
  name: string;
  sportType: string;
  pricePerHour: number;
  slotMinutes: number;
  isIndoor: boolean;
  surface: string | null;
  capacity?: number;
}

export interface Venue {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  sportsOffered: string[];
  amenities: string[];
  images: string[];
  phone: string | null;
  ratingAvg: number;
  ratingCount: number;
  courts: Court[];
  startingPrice: number | null;
  distanceKm: number | null;
}

export type SlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' | 'UNAVAILABLE';

export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  price: number;
  status: SlotStatus;
}

export interface CourtAvailability {
  court: Court;
  slots: Slot[];
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type SplitStatus = 'PENDING' | 'PAID' | 'DECLINED';

export interface BookingSplit {
  id: string;
  userId: string | null;
  name: string | null;
  phone: string | null;
  amount: number;
  status: SplitStatus;
  user?: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface Booking {
  id: string;
  userId: string;
  amount: number;
  platformFee: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: string;
  slot: Slot & { court: Court & { venue: Venue } };
  splits: BookingSplit[];
  game?: { id: string; sport: string; status: string; maxPlayers: number } | null;
}

export type GameStatus = 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED';
export type GamePlayerStatus = 'REQUESTED' | 'JOINED' | 'LEFT' | 'REMOVED';

export interface GamePlayer {
  id: string;
  userId: string;
  status: GamePlayerStatus;
  joinedAt: string;
  user: { id: string; name: string; avatarUrl: string | null; skillLevel: SkillLevel; ratingAvg: number };
}

export interface Game {
  id: string;
  hostId: string;
  title: string | null;
  sport: string;
  skillLevel: SkillLevel;
  maxPlayers: number;
  costPerPlayer: number;
  startsAt: string;
  endsAt: string;
  description: string | null;
  status: GameStatus;
  autoApprove: boolean;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  host: { id: string; name: string; avatarUrl: string | null; skillLevel: SkillLevel; ratingAvg: number };
  venue: { id: string; name: string; address: string; city: string; latitude: number; longitude: number; images: string[] } | null;
  court: { id: string; name: string; sportType: string } | null;
  players: GamePlayer[];
  playerCount: number;
  spotsLeft: number;
  isHost: boolean;
  myStatus: GamePlayerStatus | null;
  distanceKm?: number | null;
}

export interface Message {
  id: string;
  gameId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
}

export interface Review {
  id: string;
  authorId: string;
  targetType: 'VENUE' | 'PLAYER';
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
