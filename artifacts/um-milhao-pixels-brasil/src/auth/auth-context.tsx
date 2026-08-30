import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getCurrentUser,
  readOAuthSessionFromUrl,
  refreshSession,
  restoreSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  startGoogleSignIn,
  storeSession,
  type AuthSession,
  type SupabaseUser,
} from './auth-service';
import { getProfile, saveProfile, type Profile, type ProfileInput } from '@/data/profile-service';

type AuthContextValue = {
  user: SupabaseUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  authDialogOpen: boolean;
  profileDialogOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  clearError: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const hydrateProfile = useCallback(async (nextSession: AuthSession) => {
    try {
      const nextProfile = await getProfile(nextSession.user.id, nextSession.access_token);
      setProfile(nextProfile);
      return nextProfile;
    } catch {
      // The SQL migration may not be applied yet. Auth remains usable and the
      // profile dialog will show the actionable database error on save.
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const oauthSession = readOAuthSessionFromUrl();
        let nextSession = oauthSession;
        if (nextSession) {
          const user = await getCurrentUser(nextSession.access_token);
          nextSession = { ...nextSession, user };
          storeSession(nextSession);
        } else {
          nextSession = await restoreSession();
        }
        if (cancelled) return;
        setSession(nextSession);
        if (nextSession) {
          const nextProfile = await hydrateProfile(nextSession);
          if (!cancelled && !nextProfile) setProfileDialogOpen(true);
        }
      } catch (caught) {
        if (!cancelled) setError(readableError(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateProfile]);

  useEffect(() => {
    if (!session?.refresh_token || !session.expires_at) return;
    const secondsUntilExpiry = session.expires_at - Math.floor(Date.now() / 1000);
    if (secondsUntilExpiry <= 30) return;
    const timer = window.setTimeout(async () => {
      try {
        const nextSession = await refreshSession(session.refresh_token);
        setSession(nextSession);
        await hydrateProfile(nextSession);
      } catch {
        setSession(null);
        setProfile(null);
        storeSession(null);
      }
    }, Math.max(1000, (secondsUntilExpiry - 30) * 1000));
    return () => window.clearTimeout(timer);
  }, [hydrateProfile, session]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const nextSession = await signInWithPassword(email, password);
      setSession(nextSession);
      const nextProfile = await hydrateProfile(nextSession);
      setAuthDialogOpen(false);
      if (!nextProfile) setProfileDialogOpen(true);
    } catch (caught) {
      setError(readableError(caught));
      throw caught;
    }
  }, [hydrateProfile]);

  const signup = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const response = await signUpWithPassword(email, password);
      if (!response.session) {
        return { needsEmailConfirmation: true };
      }
      setSession(response.session);
      setAuthDialogOpen(false);
      setProfileDialogOpen(true);
      await hydrateProfile(response.session);
      return { needsEmailConfirmation: false };
    } catch (caught) {
      setError(readableError(caught));
      throw caught;
    }
  }, [hydrateProfile]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await startGoogleSignIn();
    } catch (caught) {
      setError(readableError(caught));
      throw caught;
    }
  }, []);

  const logout = useCallback(async () => {
    if (session) await signOut(session.access_token);
    setSession(null);
    setProfile(null);
    setProfileDialogOpen(false);
  }, [session]);

  const updateProfile = useCallback(async (input: ProfileInput) => {
    if (!session) throw new Error('Entre na sua conta para editar o perfil.');
    setError(null);
    try {
      const nextProfile = await saveProfile(session.user, input, session.access_token);
      setProfile(nextProfile);
      setProfileDialogOpen(false);
    } catch (caught) {
      setError(readableError(caught));
      throw caught;
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    error,
    authDialogOpen,
    profileDialogOpen,
    openAuth: () => {
      setError(null);
      setAuthDialogOpen(true);
    },
    closeAuth: () => {
      setError(null);
      setAuthDialogOpen(false);
    },
    openProfile: () => {
      setError(null);
      setProfileDialogOpen(true);
    },
    closeProfile: () => {
      setError(null);
      setProfileDialogOpen(false);
    },
    clearError: () => setError(null),
    login,
    signup,
    loginWithGoogle,
    logout,
    updateProfile,
  }), [authDialogOpen, error, loading, login, loginWithGoogle, logout, profile, profileDialogOpen, session, signup, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return context;
}