export type Role = 'PLAYER' | 'VENUE_OWNER' | 'ADMIN';

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
}

export interface Court {
  id: string;
  venueId: string;
  name: string;
  sportType: string;
  pricePerHour: number;
  slotMinutes: number;
  isIndoor: boolean;
  surface: string | null;
  capacity: number;
  isActive: boolean;
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
  openMinute: number;
  closeMinute: number;
  phone: string | null;
  ratingAvg: number;
  ratingCount: number;
  isActive: boolean;
  courts: Court[];
}

export type SlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';

export interface CalendarSlot {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  price: number;
  status: SlotStatus;
  booking: {
    id: string;
    amount: number;
    paymentStatus: string;
    user: { id: string; name: string; phone: string };
  } | null;
}

export interface VenueBooking {
  id: string;
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user: { id: string; name: string; phone: string };
  slot: { startsAt: string; endsAt: string; court: { name: string; sportType: string } };
}

export interface Analytics {
  rangeDays: number;
  bookingCount: number;
  grossRevenue: number;
  netRevenue: number;
  utilisationPct: number;
  revenueByDay: { date: string; amount: number }[];
  revenueByCourt: { court: string; amount: number }[];
  bookingsBySport: { sport: string; count: number }[];
}
