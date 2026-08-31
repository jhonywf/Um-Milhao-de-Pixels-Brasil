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
const supabasePublicUrl = 'https://cnyjodkusuikivdwbwcg.supabase.co';
const oauthVerifierKey = 'um-milhao-pixels.oauth-verifier';
const oauthStateKey = 'um-milhao-pixels.oauth-state';
const oauthFlowKey = 'um-milhao-pixels.oauth-flow';

export type AuthRedirectResult = {
  session: AuthSession;
  kind: 'oauth' | 'recovery';
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
  return new URL(appBasePath, window.location.origin).toString();
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
  const response = await supabaseRequest<AuthResponse>('/auth/v1/signup', {
    method: 'POST',
    body: { email, password },
  });
  const session = response.session ? normalizeSession(response.session) : null;
  if (session) storeSession(session);
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
      storeSession(null);
      return null;
    }
  }

  try {
    const user = await getCurrentUser(normalized.access_token);
    const session = { ...normalized, user };
    storeSession(session);
    return session;
  } catch {
    storeSession(null);
    return null;
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
  const state = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  sessionStorage.setItem(oauthVerifierKey, verifier);
  sessionStorage.setItem(oauthStateKey, state);
  sessionStorage.setItem(oauthFlowKey, 'oauth');

  const authorizeUrl = new URL('/auth/v1/authorize', supabasePublicUrl);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', appRedirectUrl());
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);
  window.location.assign(authorizeUrl.toString());
}

export async function requestPasswordReset(email: string) {
  const { verifier, challenge } = await createPkcePair();
  const state = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  sessionStorage.setItem(oauthVerifierKey, verifier);
  sessionStorage.setItem(oauthStateKey, state);
  sessionStorage.setItem(oauthFlowKey, 'recovery');
  await supabaseRequest('/auth/v1/recover', {
    method: 'POST',
    body: {
      email,
      redirect_to: appRedirectUrl(),
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
  return `${apiBasePath}/storage/v1/object/public/profile-avatars/${encodedPath}`;
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
  await supabaseRequest(`/storage/v1/object/profile-avatars/${path}`, {
    method: 'POST',
    accessToken,
    rawBody: file,
    headers: {
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
  });
  return path;
}

export async function readOAuthSessionFromUrl(): Promise<AuthRedirectResult | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (code) {
    const expectedState = sessionStorage.getItem(oauthStateKey);
    const returnedState = url.searchParams.get('state');
    if (expectedState && returnedState !== expectedState) {
      throw new Error('Não foi possível validar o retorno do login. Tente novamente.');
    }
    const verifier = sessionStorage.getItem(oauthVerifierKey);
    if (!verifier) {
      throw new Error('A sessão de login expirou. Inicie o processo novamente.');
    }
    const session = normalizeSession(await supabaseRequest<AuthSession>('/auth/v1/token?grant_type=pkce', {
      method: 'POST',
      body: { auth_code: code, code_verifier: verifier },
    }));
    const kind = sessionStorage.getItem(oauthFlowKey) === 'recovery' ? 'recovery' : 'oauth';
    sessionStorage.removeItem(oauthVerifierKey);
    sessionStorage.removeItem(oauthStateKey);
    sessionStorage.removeItem(oauthFlowKey);
    window.history.replaceState({}, document.title, window.location.pathname);
    return { session, kind };
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
  const kind = hash.get('type') === 'recovery' ? 'recovery' : 'oauth';
  sessionStorage.removeItem(oauthVerifierKey);
  sessionStorage.removeItem(oauthStateKey);
  sessionStorage.removeItem(oauthFlowKey);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return { session, kind };
}