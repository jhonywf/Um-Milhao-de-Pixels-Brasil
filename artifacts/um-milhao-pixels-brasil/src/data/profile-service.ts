import type { SupabaseUser } from '@/auth/auth-service';

const supabasePublicUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cnyjodkusuikivdwbwcg.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  accessToken?: string,
  options: { method?: string; body?: unknown; prefer?: string } = {},
): Promise<T> {
  if (!supabasePublishableKey) {
    throw new Error('A chave pública do Supabase não está configurada.');
  }

  const response = await fetch(`${supabasePublicUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      apikey: supabasePublishableKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'code' in payload && payload.code === '23505'
        ? 'Esse username já está em uso.'
        : typeof payload === 'object' && payload && 'message' in payload
          ? String(payload.message)
          : 'Não foi possível salvar o perfil.';
    throw new Error(message);
  }

  return payload as T;
}

export async function getProfile(userId: string, accessToken: string) {
  const rows = await profileRequest<Profile[]>(
    `/rest/v1/profiles?select=${PROFILE_COLUMNS}&id=eq.${encodeURIComponent(userId)}&limit=1`,
    accessToken,
  );
  return rows[0] ?? null;
}

export async function getPublicProfile(username: string) {
  const rows = await profileRequest<PublicProfile[]>(
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