import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Eye, EyeOff, LogOut, Mail, UserRound, X } from 'lucide-react';
import { useAuth } from './auth-context';

function DialogShell({
  children,
  onClose,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  return (
    <div className="account-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="account-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="account-dialog-close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        {children}
      </section>
    </div>
  );
}

export function AuthDialogs() {
  const {
    authDialogOpen,
    closeAuth,
    profileDialogOpen,
    closeProfile,
    user,
  } = useAuth();
  return (
    <>
      {authDialogOpen && <AuthDialog onClose={closeAuth} />}
      {profileDialogOpen && user && <ProfileDialog onClose={closeProfile} />}
    </>
  );
}

function AuthDialog({ onClose }: { onClose: () => void }) {
  const { login, signup, loginWithGoogle, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setFormError(null);
    clearError();
    setConfirmationNotice(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (mode === 'signup' && password !== confirmPassword) {
      setFormError('As senhas precisam ser iguais.');
      return;
    }
    if (password.length < 6) {
      setFormError('Use pelo menos 6 caracteres na senha.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const result = await signup(email, password);
        if (result.needsEmailConfirmation) setConfirmationNotice(true);
      }
    } catch {
      // The provider error is rendered below the form.
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell onClose={onClose} labelledBy="auth-dialog-title">
      <div className="account-dialog-kicker"><span className="eyebrow-dot" /> sua marca começa aqui</div>
      <h2 id="auth-dialog-title">{mode === 'login' ? 'Entre na parede.' : 'Crie sua conta.'}</h2>
      <p className="account-dialog-intro">
        {mode === 'login'
          ? 'Entre para guardar seu perfil e acompanhar suas próximas marcas.'
          : 'Um perfil público para sua marca. Seu e-mail nunca aparece na parede.'}
      </p>
      {confirmationNotice ? (
        <div className="account-success" role="status">
          <Check size={18} />
          <div>
            <strong>Confira seu e-mail.</strong>
            <span>Enviamos um link de confirmação para você continuar.</span>
          </div>
        </div>
      ) : (
        <>
          <button className="google-button" type="button" onClick={() => void loginWithGoogle()} disabled={busy}>
            <span className="google-mark">G</span> Continuar com Google
          </button>
          <div className="account-divider"><span>ou use seu e-mail</span></div>
          <form className="account-form" onSubmit={submit}>
            <label>
              E-mail
              <span className="account-input-wrap"><Mail size={15} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="voce@email.com" /></span>
            </label>
            <label>
              Senha
              <span className="account-input-wrap"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="mínimo de 6 caracteres" /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></span>
            </label>
            {mode === 'signup' && (
              <label>
                Repita a senha
                <span className="account-input-wrap"><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" placeholder="repita sua senha" /></span>
              </label>
            )}
            {(formError || error) && <p className="account-error" role="alert">{formError || error}</p>}
            <button className="account-submit" type="submit" disabled={busy}>
              {busy ? 'aguarde…' : mode === 'login' ? 'Entrar na conta' : 'Criar minha conta'}
            </button>
          </form>
        </>
      )}
      <p className="account-switch">
        {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
        <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Criar agora' : 'Entrar'}
        </button>
      </p>
      <small className="account-legal">Ao continuar, você concorda com os termos e a política de privacidade.</small>
    </DialogShell>
  );
}

function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, profile, updateProfile, logout, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('✦');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setDisplayName(profile?.display_name ?? '');
    setAvatarEmoji(profile?.avatar_emoji ?? '✦');
    setInstagram(profile?.instagram ?? '');
    setWebsite(profile?.website ?? '');
    setCity(profile?.city ?? '');
    setBio(profile?.bio ?? '');
    setTerms(profile?.consent_terms ?? false);
    setPrivacy(profile?.consent_privacy ?? false);
    setMarketing(profile?.consent_marketing ?? false);
    setFormError(null);
  }, [profile]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    clearError();
    if (!/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())) {
      setFormError('Escolha um username de 3 a 24 caracteres, usando letras, números ou _.');
      return;
    }
    if (!terms || !privacy) {
      setFormError('Você precisa aceitar os termos e a política de privacidade.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        username,
        display_name: displayName,
        avatar_emoji: avatarEmoji,
        instagram,
        website,
        city,
        bio,
        consent_terms: terms,
        consent_privacy: privacy,
        consent_marketing: marketing,
      });
    } catch {
      // The provider error is rendered below the form.
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell onClose={onClose} labelledBy="profile-dialog-title">
      <div className="account-dialog-kicker"><UserRound size={14} /> seu lugar na parede</div>
      <h2 id="profile-dialog-title">Quem está deixando essa marca?</h2>
      <p className="account-dialog-intro">Monte seu perfil público. O e-mail abaixo fica privado e só serve para sua conta.</p>
      <form className="account-form profile-form" onSubmit={submit}>
        <div className="profile-identity-row">
          <div className="profile-avatar">{avatarEmoji}</div>
          <label className="profile-username">
            Username
            <span className="account-input-wrap"><span className="input-prefix">@</span><input value={username} onChange={(event) => setUsername(event.target.value.replace(/\s/g, '').toLowerCase())} required placeholder="seunome" /></span>
          </label>
          <label className="profile-emoji">
            Marca
            <input className="emoji-input" value={avatarEmoji} onChange={(event) => setAvatarEmoji(event.target.value.slice(0, 2) || '✦')} aria-label="Emoji do avatar" />
          </label>
        </div>
        <label>
          Nome para aparecer
          <span className="account-input-wrap"><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Seu nome ou projeto" /></span>
        </label>
        <div className="profile-two-columns">
          <label>
            Instagram
            <span className="account-input-wrap"><span className="input-prefix">@</span><input value={instagram} onChange={(event) => setInstagram(event.target.value.replace(/^@/, ''))} placeholder="seuinstagram" /></span>
          </label>
          <label>
            Cidade
            <span className="account-input-wrap"><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Fortaleza, CE" /></span>
          </label>
        </div>
        <label>
          Site
          <span className="account-input-wrap"><input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://seusite.com" /></span>
        </label>
        <label>
          Uma frase sobre você
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="O que você quer deixar no mapa?" />
        </label>
        <div className="profile-private-email"><Mail size={14} /><span><b>{user?.email}</b><small>e-mail privado</small></span></div>
        <label className="consent-row"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /><span>Li e aceito os <u>termos de uso</u>.</span></label>
        <label className="consent-row"><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span>Li e aceito a <u>política de privacidade</u>.</span></label>
        <label className="consent-row"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Quero receber novidades do projeto <small>(opcional)</small>.</span></label>
        {(formError || error) && <p className="account-error" role="alert">{formError || error}</p>}
        <button className="account-submit" type="submit" disabled={busy}>{busy ? 'salvando…' : 'Salvar meu perfil'} <Check size={16} /></button>
      </form>
      <button className="account-logout" type="button" onClick={() => void logout()}><LogOut size={14} /> Sair da conta</button>
    </DialogShell>
  );
}