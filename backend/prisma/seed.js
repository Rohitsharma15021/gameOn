import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

const CITY = 'Bengaluru';
// Roughly downtown Bengaluru, jittered per venue below.
const BASE = { lat: 12.9716, lng: 77.5946 };

const jitter = (base, spread = 0.06) => base + (Math.random() - 0.5) * spread;
const refCode = (name) =>
  `${name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

async function main() {
  console.log('Seeding gameOn...');

  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.gamePlayer.deleteMany(),
    prisma.game.deleteMany(),
    prisma.bookingSplit.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.slot.deleteMany(),
    prisma.court.deleteMany(),
    prisma.venue.deleteMany(),
    prisma.review.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.device.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ---- Users ----
  const owner = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      phone: '+919900000001',
      email: 'priya.owner@example.com',
      role: 'VENUE_OWNER',
      city: CITY,
      latitude: BASE.lat,
      longitude: BASE.lng,
      referralCode: refCode('Priya'),
      onboardedAt: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      phone: '+919900000002',
      email: 'admin@example.com',
      role: 'ADMIN',
      city: CITY,
      referralCode: refCode('Admin'),
      onboardedAt: new Date(),
    },
  });

  const playerSeed = [
    ['Arjun Rao', 'BEGINNER', ['Badminton', 'Football']],
    ['Kavya Menon', 'INTERMEDIATE', ['Badminton', 'Tennis']],
    ['Rohit Verma', 'ADVANCED', ['Football', 'Cricket']],
    ['Sneha Iyer', 'INTERMEDIATE', ['Badminton']],
    ['Vikram Nair', 'PRO', ['Tennis', 'Badminton']],
    ['Ananya Das', 'BEGINNER', ['Football']],
    ['Karthik Reddy', 'ADVANCED', ['Cricket', 'Football']],
    ['Meera Pillai', 'INTERMEDIATE', ['Badminton', 'Table Tennis']],
  ];

  const players = [];
  for (const [name, skillLevel, sportPreferences] of playerSeed) {
    // 10-digit local number (matching what a user would actually type into the
    // app's phone field) so these accounts are reachable through the real login UI.
    const localNumber = `9000${String(players.length).padStart(6, '0')}`;
    const user = await prisma.user.create({
      data: {
        name,
        phone: `+91${localNumber}`,
        email: `${name.split(' ')[0].toLowerCase()}@example.com`,
        skillLevel,
        sportPreferences,
        city: CITY,
        latitude: jitter(BASE.lat, 0.08),
        longitude: jitter(BASE.lng, 0.08),
        referralCode: refCode(name),
        onboardedAt: new Date(),
      },
    });
    players.push(user);
  }

  // ---- Venues ----
  const venueSeed = [
    {
      name: 'Smash Court Badminton Arena',
      sportsOffered: ['Badminton'],
      amenities: ['Parking', 'Washroom', 'Drinking Water', 'Equipment Rental'],
      courts: [
        { name: 'Court 1', sportType: 'Badminton', pricePerHour: 60000, isIndoor: true },
        { name: 'Court 2', sportType: 'Badminton', pricePerHour: 60000, isIndoor: true },
        { name: 'Court 3', sportType: 'Badminton', pricePerHour: 70000, isIndoor: true, surface: 'Synthetic' },
      ],
    },
    {
      name: 'GreenTurf Football Ground',
      sportsOffered: ['Football'],
      amenities: ['Floodlights', 'Parking', 'Changing Room', 'First Aid'],
      courts: [
        { name: '5-a-side Turf A', sportType: 'Football', pricePerHour: 150000, capacity: 10 },
        { name: '5-a-side Turf B', sportType: 'Football', pricePerHour: 150000, capacity: 10 },
        { name: '7-a-side Turf', sportType: 'Football', pricePerHour: 220000, capacity: 14 },
      ],
    },
    {
      name: 'Ace Tennis Club',
      sportsOffered: ['Tennis'],
      amenities: ['Coaching', 'Parking', 'Cafeteria', 'Locker Room'],
      courts: [
        { name: 'Clay Court 1', sportType: 'Tennis', pricePerHour: 90000, surface: 'Clay' },
        { name: 'Hard Court 1', sportType: 'Tennis', pricePerHour: 80000, surface: 'Hard' },
      ],
    },
    {
      name: 'Boundary Line Cricket Nets',
      sportsOffered: ['Cricket'],
      amenities: ['Bowling Machine', 'Parking', 'Washroom'],
      courts: [
        { name: 'Net 1', sportType: 'Cricket', pricePerHour: 50000, isIndoor: true },
        { name: 'Net 2', sportType: 'Cricket', pricePerHour: 50000, isIndoor: true },
      ],
    },
    {
      name: 'Multisport Hub Indiranagar',
      sportsOffered: ['Badminton', 'Table Tennis', 'Basketball'],
      amenities: ['Parking', 'Washroom', 'Drinking Water', 'AC'],
      courts: [
        { name: 'Badminton Court A', sportType: 'Badminton', pricePerHour: 65000, isIndoor: true },
        { name: 'TT Table 1', sportType: 'Table Tennis', pricePerHour: 30000, isIndoor: true, slotMinutes: 30 },
        { name: 'Basketball Half-Court', sportType: 'Basketball', pricePerHour: 100000 },
      ],
    },
  ];

  const venues = [];
  for (const v of venueSeed) {
    const venue = await prisma.venue.create({
      data: {
        ownerId: owner.id,
        name: v.name,
        description: `${v.name} — a top-rated spot to play in ${CITY}. Book by the hour, split the cost, or join an open game.`,
        address: `${Math.floor(1 + Math.random() * 200)} Main Road, ${CITY}`,
        city: CITY,
        latitude: jitter(BASE.lat),
        longitude: jitter(BASE.lng),
        sportsOffered: v.sportsOffered,
        amenities: v.amenities,
        images: [
          `https://picsum.photos/seed/${encodeURIComponent(v.name)}1/800/600`,
          `https://picsum.photos/seed/${encodeURIComponent(v.name)}2/800/600`,
        ],
        phone: '+918041234567',
        courts: { create: v.courts },
      },
      include: { courts: true },
    });
    venues.push(venue);
  }

  // ---- Slots (today + tomorrow, first court of each venue) ----
  const days = [dayjs(), dayjs().add(1, 'day')];
  for (const venue of venues) {
    for (const court of venue.courts) {
      for (const day of days) {
        const dateOnly = new Date(`${day.format('YYYY-MM-DD')}T00:00:00.000`);
        const step = court.slotMinutes;
        const openMinute = venue.openMinute;
        const closeMinute = venue.closeMinute;
        const count = Math.floor((closeMinute - openMinute) / step);

        const rows = Array.from({ length: count }, (_, i) => {
          const startMinute = openMinute + i * step;
          const startsAt = dayjs(dateOnly).add(startMinute, 'minute').toDate();
          const endsAt = dayjs(startsAt).add(step, 'minute').toDate();
          return {
            courtId: court.id,
            date: dateOnly,
            startsAt,
            endsAt,
            price: Math.round((court.pricePerHour * step) / 60),
          };
        });
        await prisma.slot.createMany({ data: rows, skipDuplicates: true });
      }
    }
  }

  // Book a couple of slots today so "My Bookings" has something to show.
  const firstCourt = venues[0].courts[0];
  const bookableSlot = await prisma.slot.findFirst({
    where: { courtId: firstCourt.id, startsAt: { gt: new Date() } },
    orderBy: { startsAt: 'asc' },
  });

  let sampleBooking = null;
  if (bookableSlot) {
    sampleBooking = await prisma.booking.create({
      data: {
        userId: players[0].id,
        slotId: bookableSlot.id,
        amount: bookableSlot.price,
        platformFee: Math.round(bookableSlot.price * 0.05),
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentProvider: 'mock',
        paymentOrderId: 'mock_order_seed',
        paymentRef: 'mock_pay_seed',
        splits: {
          create: [
            { userId: players[0].id, name: players[0].name, phone: players[0].phone, amount: bookableSlot.price, status: 'PAID', paidAt: new Date() },
          ],
        },
      },
    });
    await prisma.slot.update({ where: { id: bookableSlot.id }, data: { status: 'BOOKED' } });
  }

  // ---- Games ----
  const badmintonVenue = venues[0];
  const footballVenue = venues[1];

  const game1 = await prisma.game.create({
    data: {
      hostId: players[1].id,
      venueId: badmintonVenue.id,
      courtId: badmintonVenue.courts[0].id,
      title: 'Evening Badminton Doubles',
      sport: 'Badminton',
      skillLevel: 'INTERMEDIATE',
      maxPlayers: 4,
      costPerPlayer: 15000,
      description: 'Casual doubles, all levels welcome. Bring your own racket or rent one there.',
      startsAt: dayjs().add(1, 'day').hour(18).minute(0).second(0).toDate(),
      endsAt: dayjs().add(1, 'day').hour(19).minute(0).second(0).toDate(),
      latitude: badmintonVenue.latitude,
      longitude: badmintonVenue.longitude,
      locationName: badmintonVenue.name,
      players: {
        create: [
          { userId: players[1].id, status: 'JOINED' },
          { userId: players[3].id, status: 'JOINED' },
        ],
      },
    },
  });

  const game2 = await prisma.game.create({
    data: {
      hostId: players[2].id,
      venueId: footballVenue.id,
      courtId: footballVenue.courts[0].id,
      title: 'Weekend 5-a-side',
      sport: 'Football',
      skillLevel: 'ADVANCED',
      maxPlayers: 10,
      costPerPlayer: 20000,
      description: "Competitive weekend match, let's go!",
      startsAt: dayjs().add(2, 'day').hour(7).minute(0).second(0).toDate(),
      endsAt: dayjs().add(2, 'day').hour(8).minute(0).second(0).toDate(),
      latitude: footballVenue.latitude,
      longitude: footballVenue.longitude,
      locationName: footballVenue.name,
      players: {
        create: [
          { userId: players[2].id, status: 'JOINED' },
          { userId: players[6].id, status: 'JOINED' },
          { userId: players[0].id, status: 'REQUESTED' },
        ],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      { gameId: game1.id, senderId: players[1].id, text: "Hey! Looking forward to it 🏸" },
      { gameId: game1.id, senderId: players[3].id, text: 'Same here, see you at 6!' },
      { gameId: game2.id, senderId: players[2].id, text: 'Bring your boots, pitch is a bit wet' },
    ],
  });

  // ---- Reviews ----
  if (sampleBooking) {
    await prisma.review.create({
      data: {
        authorId: players[0].id,
        targetType: 'VENUE',
        targetId: badmintonVenue.id,
        rating: 5,
        comment: 'Great courts, well maintained!',
      },
    });
    await prisma.venue.update({
      where: { id: badmintonVenue.id },
      data: { ratingAvg: 5, ratingCount: 1 },
    });
  }

  console.log('Seed complete:');
  console.log(`  Users: ${players.length + 2} (owner, admin, ${players.length} players)`);
  console.log(`  Venues: ${venues.length}`);
  console.log(`  Games: 2`);
  console.log('\nSample logins (OTP driver = mock, any phone below works with OTP_DEV_CODE):');
  console.log(`  Owner  : ${owner.phone}`);
  console.log(`  Admin  : ${admin.phone}`);
  console.log(`  Player : ${players[0].phone} (${players[0].name})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
