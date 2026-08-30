export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_emoji: string;
  avatar_path: string | null;
  social_network: 'instagram' | 'tiktok' | 'youtube' | null;
  social_handle: string | null;
  website: string | null;
  bio: string | null;
  city: string | null;
};

export type PixelBlockRecord = {
  id: string;
  owner_id: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  pixel_count: number;
  artwork_path: string | null;
  message: string | null;
  instagram: string | null;
  website: string | null;
  status: 'available' | 'reserved' | 'purchased' | 'published' | 'demo';
  created_at: string;
  updated_at: string;
};

export type PixelPurchaseRecord = {
  id: string;
  user_id: string;
  pixel_block_id: string;
  amount_cents: number;
  currency: 'BRL';
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  provider_reference: string | null;
  created_at: string;
};

export type PixelReservationRecord = {
  id: string;
  user_id: string;
  pixel_block_id: string;
  expires_at: string;
  status: 'active' | 'converted' | 'expired' | 'cancelled';
  created_at: string;
};

export type PixelLikeRecord = {
  user_id: string;
  pixel_block_id: string;
  created_at: string;
};

export type ActivityEventRecord = {
  id: string;
  user_id: string | null;
  type: 'profile_completed' | 'pixel_reserved' | 'pixel_purchased' | 'pixel_published' | 'like_added';
  pixel_block_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AchievementRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
};