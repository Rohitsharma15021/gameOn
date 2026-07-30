/** Shapes a user row for API output, hiding contact details from strangers. */
export function publicUser(user, { self = false } = {}) {
  if (!user) return null;
  const base = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    sportPreferences: user.sportPreferences,
    skillLevel: user.skillLevel,
    ratingAvg: Number(user.ratingAvg?.toFixed?.(2) ?? user.ratingAvg ?? 0),
    ratingCount: user.ratingCount,
    createdAt: user.createdAt,
  };

  if (!self) return base;

  return {
    ...base,
    phone: user.phone,
    email: user.email,
    role: user.role,
    latitude: user.latitude,
    longitude: user.longitude,
    referralCode: user.referralCode,
    rewardPoints: user.rewardPoints,
    onboardedAt: user.onboardedAt,
  };
}
