export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
};

export type SupabaseRequestOptions = {
  method?: string;
  body?: unknown;
  rawBody?: BodyInit;
  accessToken?: string;
  headers?: Record<string, string>;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: SupabaseUser;
};

type AuthResponse = {
  session: AuthSession | null;
  user: SupabaseUser | null;
  message?: string;
};

const STORAGE_KEY = 'um-milhao-pixels.supabase-session';
const apiBasePath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/supabase`;
const appBasePath = import.meta.env.BASE_URL;
const supabasePublicUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cnyjodkusuikivdwbwcg.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const oauthFlowStorageKey = 'um-milhao-pixels.oauth-flow';
const oauthReturnStorageKey = 'um-milhao-pixels.oauth-return-to';

type StoredPkceFlow = {
  verifier: string;
  kind: 'oauth' | 'recovery' | 'signup';
  createdAt: number;
};

function storePkceFlow(flow: StoredPkceFlow | null) {
  if (flow) {
    window.localStorage.setItem(oauthFlowStorageKey, JSON.stringify(flow));
  } else {
    window.localStorage.removeItem(oauthFlowStorageKey);
  }
}

function readPkceFlow(): StoredPkceFlow | null {
  try {
    const raw = window.localStorage.getItem(oauthFlowStorageKey);
    if (!raw) return null;
    const flow = JSON.parse(raw) as StoredPkceFlow;
    if (!flow.verifier || !flow.createdAt || Date.now() - flow.createdAt > 24 * 60 * 60 * 1000) {
      storePkceFlow(null);
      return null;
    }
    return flow;
  } catch {
    storePkceFlow(null);
    return null;
  }
}

export type AuthRedirectResult = {
  session: AuthSession;
  kind: 'oauth' | 'recovery';
  returnTo?: string;
};

function normalizeSession(session: AuthSession): AuthSession {
  const expiresIn = Number(session.expires_in) > 0 ? Number(session.expires_in) : 3600;
  const expiresAt = Number(session.expires_at) > 0
    ? Number(session.expires_at)
    : Math.floor(Date.now() / 1000) + expiresIn;
  return { ...session, expires_in: expiresIn, expires_at: expiresAt };
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createPkcePair() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = bytesToBase64Url(bytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: bytesToBase64Url(new Uint8Array(digest)) };
}

function appRedirectUrl() {
  const productionOrigin =
    'https://um-milhao-de-pixels-brasil--jhonymec2.replit.app';

  const isLocalDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const origin = isLocalDevelopment
    ? window.location.origin
    : productionOrigin;

  return new URL(appBasePath, origin).toString();
}

function getStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession | null) {
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSession(session)));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const hasRawBody = options.rawBody !== undefined;
  const response = await fetch(`${apiBasePath}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      ...(options.headers ?? {}),
      ...(!hasRawBody && options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(hasRawBody
      ? { body: options.rawBody }
      : options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'code' in payload && payload.code === '23505'
        ? 'Esse username já está em uso.'
        : typeof payload === 'object' && payload && 'msg' in payload
        ? String(payload.msg)
        : typeof payload === 'object' && payload && 'message' in payload
          ? String(payload.message)
          : 'Não foi possível concluir a operação.';
    throw new Error(message);
  }

  return payload as T;
}

export async function signInWithPassword(email: string, password: string) {
  const session = normalizeSession(await supabaseRequest<AuthSession>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  }));
  storeSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string) {
  const { verifier, challenge } = await createPkcePair();
  storePkceFlow({ verifier, kind: 'signup', createdAt: Date.now() });
  const redirectTo = encodeURIComponent(appRedirectUrl());
  const response = await supabaseRequest<AuthResponse>(`/auth/v1/signup?redirect_to=${redirectTo}`, {
    method: 'POST',
    body: {
      email,
      password,
      code_challenge: challenge,
      code_challenge_method: 's256',
    },
  });
  const session = response.session ? normalizeSession(response.session) : null;
  if (session) {
    storePkceFlow(null);
    storeSession(session);
  }
  return { ...response, session };
}

export async function getCurrentUser(accessToken: string) {
  return supabaseRequest<SupabaseUser>('/auth/v1/user', {
    accessToken,
  });
}

export async function restoreSession() {
  const stored = getStoredSession();
  if (!stored?.access_token) return null;

  const normalized = normalizeSession(stored);
  if (normalized.expires_at && normalized.expires_at <= Math.floor(Date.now() / 1000) + 30 && normalized.refresh_token) {
    try {
      return await refreshSession(normalized.refresh_token);
    } catch {
      // Do not destroy a persisted session because of a temporary
      // refresh/network failure. Keep it available for a later retry.
      return normalized;
    }
  }

  try {
    const user = await getCurrentUser(normalized.access_token);
    const session = { ...normalized, user };
    storeSession(session);
    return session;
  } catch {
    // A temporary validation/network failure must not behave like logout.
    // Explicit signOut() remains responsible for clearing local storage.
    return normalized;
  }
}

export async function refreshSession(refreshToken: string) {
  const session = normalizeSession(await supabaseRequest<AuthSession>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  }));
  storeSession(session);
  return session;
}

export async function signOut(accessToken: string) {
  try {
    await supabaseRequest('/auth/v1/logout', { method: 'POST', accessToken });
  } finally {
    storeSession(null);
  }
}

export async function startGoogleSignIn() {
  const { verifier, challenge } = await createPkcePair();
  storePkceFlow({ verifier, kind: 'oauth', createdAt: Date.now() });

  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.localStorage.setItem(oauthReturnStorageKey, returnTo);

  const authorizeUrl = new URL('/auth/v1/authorize', supabasePublicUrl);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', appRedirectUrl());
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 's256');
  window.location.assign(authorizeUrl.toString());
}

export async function requestPasswordReset(email: string) {
  const { verifier, challenge } = await createPkcePair();
  storePkceFlow({ verifier, kind: 'recovery', createdAt: Date.now() });

  const recoveryRedirectUrl = new URL(appRedirectUrl());
  recoveryRedirectUrl.searchParams.set('recovery', '1');

  await supabaseRequest('/auth/v1/recover', {
    method: 'POST',
    body: {
      email,
      redirect_to: recoveryRedirectUrl.toString(),
      code_challenge: challenge,
      code_challenge_method: 's256',
    },
  });
}

export async function updatePassword(accessToken: string, password: string) {
  await supabaseRequest('/auth/v1/user', {
    method: 'PUT',
    accessToken,
    body: { password },
  });
}

export function supabasePublicStorageUrl(path: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabasePublicUrl}/storage/v1/object/public/profile-avatars/${encodedPath}`;
}

export async function uploadProfileAvatar(userId: string, accessToken: string, file: File) {
  const extensionByMimeType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const safeExtension = extensionByMimeType[file.type] ?? 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${safeExtension}`;
  if (!supabasePublishableKey) {
    throw new Error('A chave pública do Supabase não está configurada para o upload do avatar.');
  }

  // Storage uploads go directly to Supabase. The authenticated user's JWT is
  // preserved here so storage.objects RLS can evaluate auth.uid() correctly.
  const response = await fetch(
    `${supabasePublicUrl}/storage/v1/object/profile-avatars/${path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabasePublishableKey,
        'Content-Type': file.type,
        'Cache-Control': 'no-store',
      },
      body: file,
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(payload?.message || payload?.error || 'Não foi possível enviar a foto do perfil.');
  }

  return path;
}

export async function readOAuthSessionFromUrl(): Promise<AuthRedirectResult | null> {
  const url = new URL(window.location.href);
  const authError = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (authError) {
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    throw new Error(authError);
  }

  const code = url.searchParams.get('code');
  if (code) {
    const flow = readPkceFlow();
    if (!flow?.verifier) {
      throw new Error('A sessão de autenticação expirou. Inicie o processo novamente neste navegador.');
    }

    const session = normalizeSession(await supabaseRequest<AuthSession>('/auth/v1/token?grant_type=pkce', {
      method: 'POST',
      body: { auth_code: code, code_verifier: flow.verifier },
    }));
    const isRecovery =
      flow.kind === 'recovery' ||
      url.searchParams.get('recovery') === '1';

    const kind: AuthRedirectResult['kind'] =
      isRecovery ? 'recovery' : 'oauth';
    storePkceFlow(null);

    let returnTo: string | undefined;
    if (kind === 'oauth') {
      const storedReturnTo = window.localStorage.getItem(oauthReturnStorageKey);
      window.localStorage.removeItem(oauthReturnStorageKey);

      if (storedReturnTo && storedReturnTo.startsWith('/') && !storedReturnTo.startsWith('//')) {
        returnTo = storedReturnTo;
      }
    }

    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('sb_flow_id');
    url.searchParams.delete('recovery');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    return { session, kind, returnTo };
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  const expiresIn = Number(hash.get('expires_in') ?? 3600);
  const session = normalizeSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: Number(hash.get('expires_at') ?? 0) || undefined,
    token_type: hash.get('token_type') ?? 'bearer',
    user: { id: '' },
  });
  const kind =
    hash.get('type') === 'recovery' ||
    url.searchParams.get('recovery') === '1'
      ? 'recovery'
      : 'oauth';
  storePkceFlow(null);

  let returnTo: string | undefined;
  if (kind === 'oauth') {
    const storedReturnTo = window.localStorage.getItem(oauthReturnStorageKey);
    window.localStorage.removeItem(oauthReturnStorageKey);

    if (storedReturnTo && storedReturnTo.startsWith('/') && !storedReturnTo.startsWith('//')) {
      returnTo = storedReturnTo;
    }
  }

  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return { session, kind, returnTo };
}
