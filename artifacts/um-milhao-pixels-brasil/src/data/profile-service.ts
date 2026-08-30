import type { SupabaseUser } from '@/auth/auth-service';
import { supabaseRequest } from '@/auth/auth-service';

export type Profile = {
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
  consent_terms: boolean;
  consent_privacy: boolean;
  consent_marketing: boolean;
  consent_public_profile: boolean;
  consent_public_social: boolean;
  consent_terms_at: string | null;
  consent_privacy_at: string | null;
  consent_marketing_at: string | null;
  consent_public_profile_at: string | null;
  consent_public_social_at: string | null;
  consent_terms_version: string | null;
  consent_privacy_version: string | null;
  consent_marketing_version: string | null;
  consent_public_profile_version: string | null;
  consent_public_social_version: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInput = Pick<
  Profile,
  | 'username'
  | 'display_name'
  | 'avatar_emoji'
  | 'avatar_path'
  | 'social_network'
  | 'social_handle'
  | 'website'
  | 'bio'
  | 'city'
  | 'consent_terms'
  | 'consent_privacy'
  | 'consent_marketing'
  | 'consent_public_profile'
  | 'consent_public_social'
>;

export type PublicProfile = Pick<
  Profile,
  | 'id'
  | 'username'
  | 'display_name'
  | 'avatar_emoji'
  | 'avatar_path'
  | 'social_network'
  | 'social_handle'
  | 'website'
  | 'bio'
  | 'city'
>;

const PROFILE_COLUMNS = [
  'id',
  'username',
  'display_name',
  'avatar_emoji',
  'avatar_path',
  'social_network',
  'social_handle',
  'website',
  'bio',
  'city',
  'consent_terms',
  'consent_privacy',
  'consent_marketing',
  'consent_public_profile',
  'consent_public_social',
  'consent_terms_at',
  'consent_privacy_at',
  'consent_marketing_at',
  'consent_public_profile_at',
  'consent_public_social_at',
  'consent_terms_version',
  'consent_privacy_version',
  'consent_marketing_version',
  'consent_public_profile_version',
  'consent_public_social_version',
  'onboarding_completed',
  'created_at',
  'updated_at',
].join(',');

async function profileRequest<T>(
  path: string,
  accessToken: string,
  options: { method?: string; body?: unknown; prefer?: string } = {},
) {
  return supabaseRequest<T>(path, {
    method: options.method,
    accessToken,
    body: options.body,
    headers: options.prefer ? { Prefer: options.prefer } : undefined,
  });
}

export async function getProfile(userId: string, accessToken: string) {
  const rows = await profileRequest<Profile[]>(
    `/rest/v1/profiles?select=${PROFILE_COLUMNS}&id=eq.${encodeURIComponent(userId)}&limit=1`,
    accessToken,
  );
  return rows[0] ?? null;
}

export async function getPublicProfile(username: string) {
  const rows = await supabaseRequest<PublicProfile[]>(
    `/rest/v1/public_profiles?select=id,username,display_name,avatar_emoji,avatar_path,social_network,social_handle,website,bio,city&username=eq.${encodeURIComponent(username.toLowerCase())}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function saveProfile(
  user: SupabaseUser,
  input: ProfileInput,
  accessToken: string,
) {
  const body = {
    id: user.id,
    username: input.username.trim().toLowerCase(),
    display_name: input.display_name?.trim() || null,
    avatar_emoji: input.avatar_emoji || '✦',
    avatar_path: input.avatar_path || null,
    social_network: input.social_network || null,
    social_handle: input.social_handle?.trim().replace(/^@/, '') || null,
    website: input.website?.trim() || null,
    bio: input.bio?.trim() || null,
    city: input.city?.trim() || null,
    consent_terms: input.consent_terms,
    consent_privacy: input.consent_privacy,
    consent_marketing: input.consent_marketing,
    consent_public_profile: input.consent_public_profile,
    consent_public_social: input.consent_public_social,
    onboarding_completed: true,
  };
  const rows = await profileRequest<Profile[]>(
    '/rest/v1/profiles?on_conflict=id',
    accessToken,
    {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body,
    },
  );
  return rows[0] ?? null;
}