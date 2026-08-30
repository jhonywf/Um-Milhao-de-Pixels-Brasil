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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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
  const session = await supabaseRequest<AuthSession>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  storeSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string) {
  const response = await supabaseRequest<AuthResponse>('/auth/v1/signup', {
    method: 'POST',
    body: { email, password },
  });
  if (response.session) storeSession(response.session);
  return response;
}

export async function getCurrentUser(accessToken: string) {
  return supabaseRequest<SupabaseUser>('/auth/v1/user', {
    accessToken,
  });
}

export async function restoreSession() {
  const stored = getStoredSession();
  if (!stored?.access_token) return null;

  try {
    const user = await getCurrentUser(stored.access_token);
    const session = { ...stored, user };
    storeSession(session);
    return session;
  } catch {
    storeSession(null);
    return null;
  }
}

export async function refreshSession(refreshToken: string) {
  const session = await supabaseRequest<AuthSession>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
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
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const path = `/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  window.location.assign(`${apiBasePath}${path}`);
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

export function readOAuthSessionFromUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  const expiresIn = Number(hash.get('expires_in') ?? 3600);
  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    token_type: hash.get('token_type') ?? 'bearer',
    user: { id: '' },
  };
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return session;
}