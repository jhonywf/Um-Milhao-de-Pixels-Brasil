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
  requestPasswordReset,
  refreshSession,
  restoreSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  startGoogleSignIn,
  storeSession,
  updatePassword,
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
  passwordRecoveryOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  clearError: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  loginWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  closePasswordRecovery: () => void;
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
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);

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
        const redirectResult = await readOAuthSessionFromUrl();
        let nextSession = redirectResult?.session ?? null;
        if (nextSession) {
          // Persist the PKCE exchange immediately. If the follow-up /user request
          // is temporarily unavailable, a valid OAuth login must not be lost.
          storeSession(nextSession);
          try {
            const user = await getCurrentUser(nextSession.access_token);
            nextSession = { ...nextSession, user };
            storeSession(nextSession);
          } catch {
            if (!nextSession.user?.id) throw new Error('Login concluído, mas não foi possível carregar sua conta. Atualize a página e tente novamente.');
          }
        } else {
          nextSession = await restoreSession();
        }
        if (cancelled) return;

        setSession(nextSession);

        if (nextSession && redirectResult?.returnTo && redirectResult.kind === 'oauth') {
          storeSession(nextSession);

          window.history.replaceState(
            {},
            document.title,
            redirectResult.returnTo,
          );

          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        if (nextSession) {
          if (redirectResult?.kind === 'recovery') {
            setPasswordRecoveryOpen(true);
          } else {
            await hydrateProfile(nextSession);
          }
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
    let cancelled = false;
    const secondsUntilExpiry = session.expires_at - Math.floor(Date.now() / 1000);

    const renew = async () => {
      try {
        const nextSession = await refreshSession(session.refresh_token);
        if (cancelled) return;
        setSession(nextSession);
        await hydrateProfile(nextSession);
      } catch {
        if (cancelled) return;
        setSession(null);
        setProfile(null);
        storeSession(null);
      }
    };

    if (secondsUntilExpiry <= 60) {
      void renew();
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => void renew(), Math.max(1000, (secondsUntilExpiry - 60) * 1000));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrateProfile, session]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const nextSession = await signInWithPassword(email, password);
      setSession(nextSession);
      await hydrateProfile(nextSession);
      setAuthDialogOpen(false);
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

  const sendPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await requestPasswordReset(email);
    } catch (caught) {
      setError(readableError(caught));
      throw caught;
    }
  }, []);

  const changePassword = useCallback(async (password: string) => {
    if (!session) throw new Error('Sua sessão de recuperação expirou. Solicite um novo link.');
    setError(null);
    try {
      await updatePassword(session.access_token, password);
      setPasswordRecoveryOpen(false);
      storeSession(session);
    } catch (caught) {
      setError(readableError(caught));
      throw caught;
    }
  }, [session]);

  const logout = useCallback(async () => {
    const accessToken = session?.access_token;

    // Logout local primeiro: a interface deve responder imediatamente.
    setSession(null);
    setProfile(null);
    setProfileDialogOpen(false);
    storeSession(null);

    // Depois tentamos revogar a sessao remotamente.
    // Falha de rede nao deve impedir o logout local.
    if (accessToken) {
      try {
        await signOut(accessToken);
      } catch {
        // Sessao local ja foi removida com seguranca.
      }
    }
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
    passwordRecoveryOpen,
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
    closePasswordRecovery: () => {
      setError(null);
      setPasswordRecoveryOpen(false);
    },
    clearError: () => setError(null),
    login,
    signup,
    loginWithGoogle,
    requestPasswordReset: sendPasswordReset,
    updatePassword: changePassword,
    logout,
    updateProfile,
  }), [authDialogOpen, changePassword, error, loading, login, loginWithGoogle, logout, passwordRecoveryOpen, profile, profileDialogOpen, sendPasswordReset, session, signup, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return context;
}