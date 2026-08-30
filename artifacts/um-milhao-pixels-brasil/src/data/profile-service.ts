import type { SupabaseUser } from '@/auth/auth-service';
import { supabaseRequest } from '@/auth/auth-service';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_emoji: string;
  instagram: string | null;
  website: string | null;
  bio: string | null;
  city: string | null;
  consent_terms: boolean;
  consent_privacy: boolean;
  consent_marketing: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInput = Pick<
  Profile,
  | 'username'
  | 'display_name'
  | 'avatar_emoji'
  | 'instagram'
  | 'website'
  | 'bio'
  | 'city'
  | 'consent_terms'
  | 'consent_privacy'
  | 'consent_marketing'
>;

const PROFILE_COLUMNS = [
  'id',
  'username',
  'display_name',
  'avatar_emoji',
  'instagram',
  'website',
  'bio',
  'city',
  'consent_terms',
  'consent_privacy',
  'consent_marketing',
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
    instagram: input.instagram?.trim().replace(/^@/, '') || null,
    website: input.website?.trim() || null,
    bio: input.bio?.trim() || null,
    city: input.city?.trim() || null,
    consent_terms: input.consent_terms,
    consent_privacy: input.consent_privacy,
    consent_marketing: input.consent_marketing,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
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